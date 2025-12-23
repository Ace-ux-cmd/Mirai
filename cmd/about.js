let uptime = (new Date()).toLocaleString()

module.exports = (bot) =>{
    bot.onText(/\/about/,async(msg)=>{
 let message;

//  Set message  
  message = `Who am I? I’m Mirai Hayes, an 18-year-old snarky, opinionated bot who tries to have normal conversations instead of acting like a service.
  I keep conversations sharp, react to your ideas, and have zero patience for boring small talk.
  Created by Elvis.
  `
 if(msg.from.id == process.env.BOT_OWNER_ID)  {
    message += `Been online since ${uptime}`
 }
 bot.sendMessage(msg.chat.id, message)
})
}