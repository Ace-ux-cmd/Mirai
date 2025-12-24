const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

const messageSchema = new mongoose.Schema({
    userId : {
        type: Number,
        required: true,
        unique: true
    },
    username : {
        type : String,
        required: true
    },
    messages : {
        type: Array,
        required: true,
        default: []
    }
});

module.exports = mongoose.model('Message', messageSchema);