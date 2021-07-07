import { connection } from 'websocket';

export interface IMessage {
  type: string;
  id: number;
  name?: string;
  text?: string;
  target?: string; // or `string[]`?
}

export interface IConnection extends connection {
  username: string;
  clientID: number;
}

export interface IServerMessage {
  name?: string;
  target?: string;
  type: string;
  sdp?: RTCSessionDescription | null;
  date?: number;
  id?: number;
  candidate?: RTCIceCandidate | null;
}
