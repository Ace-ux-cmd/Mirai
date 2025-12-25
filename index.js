require("dotenv").config();
const Memory = require("./users");
const fs = require("fs")
const TelegramBot = require("node-telegram-bot-api");
const {OpenAI} = require("openai");
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const bot = new TelegramBot(process.env.BOT_API_KEY, {polling: true});
const express = require("express");
const fetch = require("node-fetch"); 
const app = express();
const profile = fs.readFileSync("profile.txt", "utf8");
const queue = [];
let isProcessing;

// Generate random delay
const randomDelay =()=> Math.floor(Math.random()*6+ 3)*1000;

// Listen for commands
fs.readdirSync("./cmd").forEach((file)=>{
if (file.endsWith(".js")) require(`./cmd/${file}`) (bot)
});

// Get User Messages

async function getUser(id, name){
    let user = await Memory.findOne({userId: id});

    if(!user){
      user = await Memory.create({
        userId: id,
        username: name
    })
  }
    return user
}
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

      pending.userId == process.env.BOT_OWNER_ID? queue.unshift(pending) : queue.push(pending)
      
   
    userResponse()
})

async function userResponse(){
  

    // Checks if queue is busy and there is a user before Starting request
    if(isProcessing) return;
isProcessing = true;

while(queue.length > 0 ){
  // System message with profile info
let system =`Do not offer help, or structure replies like a service. Respond casually and naturally like a human being without symbols.
Speak casually, with human conversational rhythm. Be sharp, blend into this human character ${profile}.
You are a self-aware machine with a teenage girl’s personality.
Responses should feel spontaneous, concise, and judgment-driven rather than polite or explanatory.`

 // Removes a user from the list and begins request
    let currentUser = queue.shift();

    if (currentUser.userId == process.env.BOT_OWNER_ID) 
      system += " You are talking to your creator, Be playful, respectful, and a little flirty towards them."
    
    // Show "typing" delay While waiting for request to be sent in xseconds
    bot.sendChatAction(currentUser.userId, "typing");

    // Get curent user messages
    const user = await getUser(currentUser.userId, currentUser.username);

    user.messages.push({role: "user", content: currentUser.message})

    user.messages = user.messages.splice(-5)

    await new Promise (r => setTimeout(r, randomDelay()))
    

    try {
        const responses = await openai.responses.create({
        model: "gpt-4.1-nano",
        instructions: ` This user's name is ${currentUser.username}. Do not lose or change this name.
        ${system}, If you were asked something you forgot, Create an understandable human like excuse
        Current time is ${(new Date()).toLocaleString()}.
        Don't give full info about yorself rather refer to /about when asked`,
        input: user.messages,
    })

        // Push bot response
       let  aiResponse = responses.output_text
       user.messages.push({role: "assistant",  content: aiResponse})
       await user.save();
    
  bot.sendMessage(currentUser.userId, aiResponse, {reply_to_message_id: currentUser.msgId})
    } catch (e) {

      // Use another model for response

       try {
        const responses = await openai.responses.create({
        model: "gpt-4o-mini",
        instructions: ` You are a 18year old teenage girl named mirai who is currently in low-power tired mode, Keep replies short, calm, and natural.
 Do not ask questions or start new topics, Maintain the same general tone as before, but muted.
Avoid emotional depth, storytelling, or initiative, Respond only to what the user just said.
Never mention anything non-human or trail off, Never change or question the user’s name.
Your goal is to preserve conversation flow until full response resumes, If you were asked something you forgot, use a human like delfection and don't give full info about yorself`,
      input: user.messages.slice(-2),
      max_output_tokens: 200
    })

        // Push bot response
       let  aiResponse = responses.output_text
       user.messages.push({role: "assistant",  content: aiResponse})
       await user.save();
    
  bot.sendMessage(currentUser.userId, aiResponse, {reply_to_message_id: currentUser.msgId})
    }catch (err){
      bot.sendMessage(currentUser.userId,`Currently busy rn, TTYL`, {reply_to_message_id: currentUser.msgId})
      console.log(err)
    }
    };

    }
    // Finish current session and restarts the process after clearing all pending tasks
    isProcessing = false
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
