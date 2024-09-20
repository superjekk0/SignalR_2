import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Channel, UserEntry } from '../../models/models';
import { AuthenticationService } from 'src/app/services/authentication.service';

// On doit commencer par ajouter signalr dans les node_modules: npm install @microsoft/signalr
// Ensuite on inclut la librairie
import * as signalR from "@microsoft/signalr"

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {

  message: string = "test";
  messages: string[] = [];

  usersList: UserEntry[] = [];
  channelsList: Channel[] = [];

  isConnectedToHub: boolean = false;

  newChannelName: string = "";

  selectedChannel: Channel | null = null;
  selectedUser: UserEntry | null = null;

  private hubConnection?: signalR.HubConnection

  constructor(public http: HttpClient, public authentication: AuthenticationService) {

  }

  connectToHub() {
    // On commence par créer la connexion vers le Hub
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7060/chat', { accessTokenFactory: () => sessionStorage.getItem("token")!/*, skipNegotiation: true, transport: signalR.HttpTransportType.WebSockets*/ })
      .build();

    // On peut commencer à écouter pour les messages que l'on va recevoir du serveur
    this.hubConnection.on('UsersList', (data) => {
      this.usersList = data;
    });

    // TODO: Écouter le message pour mettre à jour la liste de channels

    this.hubConnection.on("NewChannel", (data: Channel) => {
      this.channelsList.push(data);
      this.messages.push(`[Tous] Le canal ${data.title} a été créé`);
    });

    this.hubConnection.on("DeleteChannel", (id: number) => {
      let channelIndex: number = this.channelsList.findIndex(c => c.id == id);
      let canal = this.channelsList[channelIndex];
      this.channelsList.splice(channelIndex, 1);
      this.messages.push(`[Tous] Le canal ${canal.title} a été supprimé`)
    })

    this.hubConnection.on('NewMessage', (message) => {
      this.messages.push(message);
    });

    // TODO: Écouter le message pour quitter un channel (lorsque le channel est effacé)

    // On se connecte au Hub
    this.hubConnection
      .start()
      .then(() => {
        this.isConnectedToHub = true;
      })
      .catch(err => console.log('Error while starting connection: ' + err))
  }

  joinChannel(channel: Channel) {
    let selectedChannelId = this.selectedChannel ? this.selectedChannel.id : 0;
    this.hubConnection!.invoke('JoinChannel', selectedChannelId, channel.id);
    this.selectedChannel = channel;
  }

  sendMessage() {
    let selectedChannelId = this.selectedChannel ? this.selectedChannel.id : 0;
    this.hubConnection!.invoke('SendMessage', this.message, selectedChannelId, this.selectedUser?.value);
  }

  userClick(user: UserEntry) {
    if (user == this.selectedUser) {
      this.selectedUser = null;
    }
  }

  createChannel() {
    this.hubConnection!.invoke("CreateChannel", this.newChannelName);
  }

  deleteChannel(channel: Channel) {
    // TODO: Ajouter un invoke
    this.hubConnection?.invoke("DeleteChannel", channel.id);
  }

  leaveChannel() {
    let selectedChannelId = this.selectedChannel ? this.selectedChannel.id : 0;
    this.hubConnection!.invoke('JoinChannel', selectedChannelId, 0);
    this.selectedChannel = null;
  }
}
