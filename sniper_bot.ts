import { Client, GatewayIntentBits, Message } from 'discord.js';  
import dotenv from 'dotenv';  
  
// Charger les variables d'environnement  
dotenv.config();  
  
// Types pour les r‚ponses JSON  
interface PollData {  
  type: 'poll';  
  question: string;  
  options: { text: string }[];  
  duration: number;  
  allowMultiselect: boolean;  
}  
  
interface EmbedData {  
  type: 'message_enrichi';  
  embeds: {  
    title?: string;  
    description?: string;  
    color?: string;  
    fields?: { name: string; value: string }[];  
  }[];  
}  
  
interface FileUploadData {  
  type: 'file_upload';  
  fileName: string;  
  content: string;  
}  
  
type BotResponse = PollData | EmbedData | FileUploadData | string; 
