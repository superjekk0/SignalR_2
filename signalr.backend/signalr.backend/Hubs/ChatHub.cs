using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using signalr.backend.Data;

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

        // TODO Aurait très bien pu être fait sur le OnConnect
        public async Task JoinChatRoom()
        {
            // TODO Context.ConnectionId est l'identifiant de la connection entre le web socket et l'utilisateur
            // TODO Ce sera utile pour créer des groups
            UserHandler.UserConnections.Add(CurentUser.Email!, Context.ConnectionId);
            await UserList();
        }

        public async Task UserList()
        {
            // TODO On envoie un évènement de type UserList à tous les Utilisateurs
            // TODO On peut envoyer en paramètre tous les types que l'om veut,
            // ici serHandler.UserConnections.Keys correspond à la liste de tous les emails des utilisateurs connectés
            await Clients.All.SendAsync("UserList", UserHandler.UserConnections.Keys);
        }

        public async Task StartPrivateChat(string userToChatWith)
        {
            string? userToChatWithConnectionId = UserHandler.UserConnections[userToChatWith];

            string groupName = "Chat" + userToChatWith + CurentUser.Email;

            // TODO On crée un group en 2 utilisateurs connectés
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Groups.AddToGroupAsync(userToChatWithConnectionId, groupName);

            PrivateChat privateChat = new PrivateChat();
            privateChat.Name = groupName;
            privateChat.Messages.Add("La conversation débute");

            // TODO On envoie la nouvelle conversation au 2 utilisateurs du groupe
            await Clients.Group(groupName).SendAsync("NewMessage", privateChat);
        }

        public async Task NewMessage(string newMessage, PrivateChat privateChat)
        {
            // TODO On met à jours la conversation, puis on la renvoit au 2 utilisateurs du groupe
            privateChat.Messages.Add(CurentUser.Email + " | " + newMessage);
            await Clients.Group(privateChat.Name).SendAsync("NewMessage", privateChat);
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            // TODO Lors de la fermeture de la connexion, on met à jour notre dictionnary d'utilisateurs connectés
            KeyValuePair<string,string> entrie = UserHandler.UserConnections.SingleOrDefault(uc=>uc.Value == Context.ConnectionId);
            UserHandler.UserConnections.Remove(entrie.Key);
            UserList();
            return base.OnDisconnectedAsync(exception);
        }
    }
}