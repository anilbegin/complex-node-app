const usersCollection = require('../db').db().collection("users")
const followsCollection = require('../db').db().collection("follows")

const ObjectID = require('mongodb').ObjectID
const User = require('./User') 

let Follow = function(followedUsername, authorId) {
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}


Follow.prototype.cleanUp = async function() {
    
    if(typeof(this.followedUsername) != "string") {
        this.followedUsername = ""
    }
    
    
}


Follow.prototype.validate = async function(action) {
    //followedUsername must exist in Database
    let followedAccount = await usersCollection.findOne({username: this.followedUsername})
    //console.log(followedAccount)
    //console.log(followedAccount._id) 
    if(followedAccount) {
       //console.log(followedAccount._Id) // getting undefined
       //console.log(ObjectID(followedAccount._Id))
        this.followedId = followedAccount._id
    } else {
        this.errors.push("You cannot follow a user that does not exist")
    }

    let doesFollowAlreadyExists = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    if(action == "create") {
        if(doesFollowAlreadyExists) {
            this.errors.push("You are already following this user")
        }
    }
    if(action == "delete") {
        if(!doesFollowAlreadyExists) {
            this.errors.push("You cannot stop following someone, you do not already follow")
        }
    }

    //Should not be able to follow Yourself
    if(this.followedId.equals(this.authorId))
    {
        this.errors.push("You cannot follow yourself!")
    }
}

Follow.prototype.create = function() {
    return new Promise(async(resolve, reject) => {
       this.cleanUp()
    await this.validate("create")
    if(!this.errors.length) {
      await followsCollection.insertOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    //  console.log(this.followedId)
      resolve()  
    } else {
        reject(this.errors)
    }
    })
}

Follow.prototype.delete = function() {
    return new Promise(async(resolve, reject) => {
       this.cleanUp()
    await this.validate("delete")
    if(!this.errors.length) {
      await followsCollection.deleteOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
    //  console.log(this.followedId)
      resolve()  
    } else {
        reject(this.errors)
    }
    })
}

Follow.isVisitorFollowing = async function(followedId, visitorId) {
    //console.log(visitorId)
    let followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
    //console.log(followDoc)
    if(followDoc) {
        return true
    } else {
        return false
    }
}

Follow.getFollowersById = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {$match: {followedId: id}},
                {$lookup: {from: "users", localField: "authorId", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            followers = followers.map(function(follower) {
                // create a user
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        } catch {
            reject()
        } 
    })
}

// here follower has not been changed to following anywhere, although you can change it for Your understandablity
Follow.getFollowingById = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {$match: {authorId: id}},
                {$lookup: {from: "users", localField: "followedId", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()
            followers = followers.map(function(follower) {
                // create a user
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        } catch {
            reject()
        } 
    })
}

Follow.countFollowersById = function(id) {
    return new Promise(async (resolve, reject) => {
        let followerCount = await followsCollection.countDocuments({followedId: id})
        resolve(followerCount)
    })
}

Follow.countFollowingById = function(id) {
    return new Promise(async (resolve, reject) => {
        let count = await followsCollection.countDocuments({authorId: id})
        resolve(count)
    })
}


module.exports = Follow