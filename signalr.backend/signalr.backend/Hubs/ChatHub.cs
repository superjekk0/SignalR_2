using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using signalr.backend.Data;
using signalr.backend.Models;

namespace signalr.backend.Hubs
{
    // TODO On garde en mémoire les connexions actives pour facile démarrer des groupes de conversations
    // TODO n'est pas nécessaire dans le TP
    public static class UserHandler
    {
        public static Dictionary<string, string> UserConnections { get; set; } = new Dictionary<string, string>();
    }

    // TODO Pour être sauvegardé en BD
    public class PrivateChat
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public List<string> Messages { get; set; } = new List<string>();
    }

    // TODO L'annotation Authorize fonctionne de la même façon avec SignalR qu'avec Web API
    [Authorize]
    // TODO Le Hub est le type de base des "contrôleurs" de web sockets
    public class ChatHub : Hub
    {
        public ApplicationDbContext _context;


        public IdentityUser CurentUser
        {
            get
            {
                // TODO on récupère le userid à partir du Cookie qui devrait être envoyé automatiquement
                string userid = Context.UserIdentifier!;

                var user = _context.Users.Single(u => u.Id == userid);

                return user;
            }

        }

        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task JoinChatRoom()
        {
            // TODO Context.ConnectionId est l'identifiant de la connection entre le web socket et l'utilisateur
            // TODO Ce sera utile pour créer des groups
            UserHandler.UserConnections.Add(CurentUser.Email!, Context.ConnectionId);
            await UserList();
            await Clients.Caller.SendAsync("ChannelsList", _context.Channel.ToList());
        }

        public async Task CreateChannel(string title)
        {
            _context.Channel.Add(new Channel { Title = title });
            await _context.SaveChangesAsync();

            await Clients.Caller.SendAsync("ChannelsList", await _context.Channel.ToListAsync());
        }

        public async Task UserList()
        {
            // TODO On envoie un évènement de type UserList à tous les Utilisateurs
            // TODO On peut envoyer en paramètre tous les types que l'om veut,
            // ici serHandler.UserConnections.Keys correspond à la liste de tous les emails des utilisateurs connectés
            await Clients.All.SendAsync("UsersList", UserHandler.UserConnections.Keys);
        }

        public async Task JoinChannel(int oldChannelId, int newChannelId)
        {
            string userTag = "[User: " + CurentUser.Email! + "]";

            if(oldChannelId > 0)
            {
                string oldGroupName = "Channel" + oldChannelId;
                Channel channel = _context.Channel.Find(oldChannelId);
                string message = userTag + "is leaving: " + channel.Title;
                await Clients.Group(oldGroupName).SendAsync("NewMessage", message);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, oldGroupName);
            }
            
            if(newChannelId > 0)
            {
                string newGroupName = "Channel" + newChannelId;
                await Groups.AddToGroupAsync(Context.ConnectionId, newGroupName);

                Channel channel = _context.Channel.Find(newChannelId);
                string message = userTag + "has joined: " + channel.Title;
                await Clients.Group(newGroupName).SendAsync("NewMessage", message);
            }
        }

        public async Task SendMessage(string message, int channelId, string userId)
        {
            if (userId != null)
            {
                string messageWithTag = "[From User: " + CurentUser.Email! + "] " + message;
                await Clients.User(userId).SendAsync("NewMessage", messageWithTag);
            }
            else if (channelId != 0)
            {
                string groupName = "Channel" + channelId;
                await Clients.Group(groupName).SendAsync("NewMessage", "[Channel] " + message);
            }
            else
            {
                await Clients.All.SendAsync("NewMessage", "[General] " + message);
            }
        }

        public async override Task OnDisconnectedAsync(Exception exception)
        {
            // TODO Lors de la fermeture de la connexion, on met à jour notre dictionnary d'utilisateurs connectés
            KeyValuePair<string,string> entrie = UserHandler.UserConnections.SingleOrDefault(uc=>uc.Value == Context.ConnectionId);
            UserHandler.UserConnections.Remove(entrie.Key);
            await UserList();
        }
    }
}