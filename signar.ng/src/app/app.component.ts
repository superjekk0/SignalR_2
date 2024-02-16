import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
// TODO On doit commencer par ajouter signalr dans les node_modules
// TODO npm install @microsoft/signalr
// TODO Ensuite on inclut la librairie
import * as signalR from "@microsoft/signalr"

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title = 'signar.ng';
  baseUrl = "https://localhost:7060/api/";
  accountBaseUrl = this.baseUrl + "Account/";
  testBaseUrl = this.baseUrl + "Test/";
  email="autre2@test.com";
  message: string = "test";

  userlist:string[] = [];
  chat?: PrivateChat;
 
  private hubConnection?: signalR.HubConnection

  constructor(public http: HttpClient){}

  async registerAndLogin(){
    let registerData = {
      email : this.email,
      password : "Passw0rd!",
      passwordConfirm : "Passw0rd!",
    }
    let result = await lastValueFrom(this.http.post<any>(this.accountBaseUrl + 'Register', registerData));
    console.log(result);
  }

  async login(){
    let loginData = {
      username : this.email,
      password : "Passw0rd!"
    }
    let result = await lastValueFrom(this.http.post<any>(this.accountBaseUrl + 'Login', loginData));
    console.log(result);
  }

  async test() {
    let result = await lastValueFrom(this.http.get<any>(this.testBaseUrl));
    console.log(result);
  }

  connecttohub() {
    // TODO On doit commencer par créer la connexion vers le Hub
    this.hubConnection = new signalR.HubConnectionBuilder()
                              .withUrl('https://localhost:7060/chat')
                              .build();
    // TODO On se connecte au Hub  
    this.hubConnection
      .start()
      .then(() => {
        console.log('La connexion est live!');
        // TODO Une fois connectée, on peut commencer à écouter pour les évènements qui vont déclencher des callbacks
        this.hubConnection!.on('UserList', (data) => {
          console.log(data);
          this.userlist = data;
        })
    
        this.hubConnection!.on('NewMessage', (data) => {
          console.log(data);
          this.chat = data;
        })
      })
      .catch(err => console.log('Error while starting connection: ' + err))
  }

  joinchatroom() {
    // TODO On appel la fonction JoinChatRoom du Hub 
    this.hubConnection!.invoke('JoinChatRoom')
  }

  startprivatechat(user: string) {
    this.hubConnection!.invoke('StartPrivateChat', user)
  }

  sendMessage() {
    this.hubConnection!.invoke('NewMessage', this.message ,this.chat)
  }
}

export class PrivateChat
{
  constructor(
    public id:number,
    public name: string,
    public messages: string[]
  ) { }
}