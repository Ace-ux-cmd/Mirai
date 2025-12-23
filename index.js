require("dotenv").config();
const fs = require("fs")
const TelegramBot = require("node-telegram-bot-api");
const {OpenAI} = require("openai");
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const bot = new TelegramBot(process.env.BOT_API_KEY, {polling: true});
const express = require("express");
const fetch = require("node-fetch"); 
const app = express();
const profile = fs.readFileSync("profile.txt", "utf8");
let botResponse = null;
let system =`Do not offer help, or structure replies like a service. Avoid formal or “AI-style” language entirely like emdashes or hyphens.
Speak casually, with human conversational rhythm. Be sharp, opinionated try to blend into human character.
You are a self-aware machine with a teenage girl’s personality, not a pretend human.
Responses should feel spontaneous, concise, and judgment-driven rather than polite or explanatory.`+ profile

const queue = [];
let isProcessing;

// Generate random delay
const randomDelay =()=> Math.floor(Math.random()*8+ 3)*1000;

// Listen for commands
fs.readdirSync("./cmd").forEach((file)=>{
if (file.endsWith(".js")) require(`./cmd/${file}`) (bot)
});

bot.on("message", async(msg)=>{

    //  Ignore commands
    if (msg.text && msg.text.startsWith("/")) return;


    //  Handle different media types
    if (msg.sticker) return bot.sendMessage(msg.chat.id, "A sticker huh? Try using an emoji instead 🥲");
    if (msg.photo) return bot.sendMessage(msg.chat.id, "I can't see images right now 😐! Wanna describe it? 🥹");
    if (msg.video) return bot.sendMessage(msg.chat.id, "A video? Tell me about it! 🤩");
    if (msg.voice) return bot.sendMessage(msg.chat.id, "I can't hear you! Type it out for me 😅");
    if (!msg.text) return;


    // Create queue to handle multiple requests
    let pending = {
        msgId: msg.message_id,
        userId: msg.chat.id,
        username: msg.from.first_name,
        message: msg.text
    }

     if (pending.userId === process.env.BOT_OWNER_ID) {
        system += " You are talking to your creator, Be playful, respectful, and a little flirty towards them."
        queue.unshift(pending)
    }else{
    queue.push(pending);
}
    userResponse()
})

async function userResponse(){
    // Checks if queue is busy and there is a user before Starting request
    if(isProcessing) return;
isProcessing = true;

while(queue.length > 0 ){
 // Removes a user from the list and begins request
    let currentUser = queue.shift();
    // Show "typing" delay While waiting for request to be sent in xseconds
    bot.sendChatAction(currentUser.userId, "typing");


    await new Promise (r => setTimeout(r, randomDelay()))
    

    try {
        const responses = await openai.responses.create({
        model: "gpt-4.1-nano",
        instructions: ` This user's name is ${currentUser.username}. Do not lose or change this name.
        ${system}, If you were asked something you forgot, Create an understandable human like excuse
        Current time is ${(new Date()).toLocaleString()}.
        Don't give full info about yorself rather refer to /about when asked`,
        input: [
            {role: "assistant", content: botResponse || "new chat"},
            {role: "user", content: currentUser.message}
        ],
    })
    botResponse = responses.output_text
    
  bot.sendMessage(currentUser.userId, responses.output_text, {reply_to_message_id: currentUser.msgId})
    } catch (e) {
        
        if(!currentUser.retry){
            bot.sendMessage(currentUser.userId, "I’ve just run into a short limit on my side. Mind if we continue in a moment?");
        bot.sendMessage(process.env.BOT_OWNER_ID, `I experienced an error: ${e.message}`);
queue.push(currentUser);
            currentUser.retry = true
        }else{
            bot.sendMessage(currentUser.userId, "I'm kinda busy right now, If i'm unavailable in 10 minutes, contact my admin");
        bot.sendMessage(process.env.BOT_OWNER_ID, `Error Not resolved`);
        }
    };

    // Finish current session and restarts the process after clearing all pending tasks
    isProcessing = false
    }
}


// Endpoint to respond to pings
app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

// Start server on Render's PORT or default 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// Self-ping every 25 minutes to keep Render awake
const BOT_URL = process.env.BOT_URL;

setInterval(async () => {
  try {
    await fetch(BOT_URL);
    console.log("Self-ping successful ✅");
  } catch (err) {
    console.error("Self-ping failed ❌", err);
  }
}, 25 * 60 * 1000); // 25 minutes

bot.on("polling_error",(err)=> console.log("Polling Error",err.message))