const mongoose = require('mongoose');
const isEmail = require('validator/lib/isEmail.js');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
var JWT_SECRET;
try {
    JWT_SECRET = require("./../config.json")['JWT_SECRET'];
} catch(e) {
    JWT_SECRET = process.env.JWT_SECRET;
}

var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true,
        validate: {
            validator: (v) => {
                return isEmail(v);
            },
            message: "{VALUE} is not a valid e-mail"
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function() {
    var user = this;
    var userObject = user.toObject();

    return _.pick(userObject,['_id','email']);
};

UserSchema.methods.generateAuthToken = function() {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({_id:user._id.toHexString(), access}, JWT_SECRET).toString();

    user.tokens = user.tokens.concat([{access,token}]);
    return user.save().then(()=> {
        return token;
    });
};

UserSchema.methods.removeToken = function(token) {
    var user = this;
    return user.updateOne({
        $pull: {
            tokens: {token}
        }
    });
}

UserSchema.statics.findByToken = function(token) {
    var User = this;
    var decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch(e) {
        return new Promise((resolve,reject) => {
            reject();
        });
    }
    
    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};

UserSchema.pre('save',function(next){
    var user = this;
    if(user.isModified('password')) {
        bcrypt.genSalt(10,(err,salt) => {
            bcrypt.hash(user.password,salt,(err,hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

var User = mongoose.model('User',UserSchema);

module.exports = {User};