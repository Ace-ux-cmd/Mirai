module.exports = (bot) =>{
    bot.onText(/\/start/, (msg)=>{
        const welcomeMessage = `Hey there ${msg.chat.first_name}. I’m Mirai. Cooler than whatever you talked to last, obviously.
If you want updates or chaos in a group chat, /support gets you there.
Or use /callad if you wish to message my admins`

 bot.sendMessage(msg.chat.id, welcomeMessage);
    })
}