let connection: WebSocket;
let clientID = 0;

const setUsername = () => {
  console.log("***SETUSERNAME");
  const msg = {
    name: (document.getElementById('name') as HTMLButtonElement).value,
    date: Date.now(),
    id: clientID,
    type: 'username'
  };
  connection.send(JSON.stringify(msg));
};

const connect = () => {
  let serverUrl;
  let scheme = 'ws';

  // If this is an HTTPS connection, we have to use a secure WebSocket
  // connection too, so add another "s" to the scheme.

  if (document.location.protocol === "https:") {
    scheme += "s";
  }

  serverUrl = scheme + "://" + document.location.hostname + ":6502";

  connection = new WebSocket(serverUrl, "json");
  console.log("***CREATED WEBSOCKET");

  connection.onopen = evt => {
    console.log("***ONOPEN");
    (document.getElementById("text") as HTMLInputElement).disabled = false;
    (document.getElementById("send") as HTMLButtonElement).disabled = false;
  };
  console.log("***CREATED ONOPEN");

  connection.onmessage = evt => {
    console.log("***ONMESSAGE");
    const f = (document.getElementById('chatbox') as HTMLIFrameElement).contentDocument;
    let text = '';
    const msg = JSON.parse(evt.data);
    console.log("Message received: ");
    console.dir(msg);
    const time = new Date(msg.date);
    const timeStr = time.toLocaleTimeString();

    switch(msg.type) {
      case "id":
        clientID = msg.id;
        setUsername();
        break;
      case "username":
        text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
        break;
      case "message":
        text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
        break;
      case "rejectusername":
        text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
        break;
      case "userlist":
        let ul = '';

        for (let i=0; i < msg.users.length; i++) {
          ul += msg.users[i] + "<br>";
        }
        (document.getElementById("userlistbox") as HTMLDivElement).innerHTML = ul;
        break;
    }

    if (text.length) {
      f!.write(text);
      ((document.getElementById("chatbox") as HTMLIFrameElement)
        .contentWindow! as WindowProxy & {scrollByPages: (i: number) => void}).scrollByPages(1);
    }
  };
  console.log("***CREATED ONMESSAGE");
};

const send = () => {
  console.log("***SEND");
  const textElement = document.getElementById("text") as HTMLInputElement;
  const msg = {
    text: textElement.value,
    type: 'message',
    id: clientID,
    date: Date.now()
  };
  connection.send(JSON.stringify(msg));
  textElement.value = "";
};

const handleKey = (evt: KeyboardEvent) => {
  if (evt.keyCode === 13 || evt.keyCode === 14
    && !(document.getElementById("send") as HTMLButtonElement).disabled) {
    send();
  }
};
