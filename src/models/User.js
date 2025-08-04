// not using this model for now to be adjusted later
const { required } = require("joi");
const mongoose= require("mongoose");

const UserSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    phone:{
        type:String,
    },
    status:{
        type:String,
        enum:["active","inactive"],
        default:"active"
    },
    roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role' 
    }],
    isDeleted:{
        type:Boolean,
        default:false
    },
},
);

const User= mongoose.model("User",UserSchema);

module.exports=User;