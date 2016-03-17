/**
 * This is a Joule which sends an SMS to a given phone number.
 * Author: Jaisen Mathai <jaisen@jmathai.com>
 */

/*
 * The joule-node-response module helps format responses properly.
 */
var Response = require('joule-node-response');
var Users = require('./users');
var Client = require('./client');

exports.handler = function(event, context) {
  var response = new Response()
      , client = new Client()
      , users = new Users()
      , component = event.path[0] || null;

  response.setContext(context);
  response.setContentType('application/json');


  users.init()
    .done(function(userList) {
      users.initUsers(userList);
      var userStatus = users.getUserStatus(event.query['From']);

      switch(component) {
        case 'reset':
          users.reset()
            .done(function(data) {
              response.send('Reset');
            });
          break;
        default:
          // if the body is "start" we register the user
          // else we check if the user has a name
          //  if the user is regisered but does not have a name we assume the Body is the name and store it
          //  else if the user has a name we send the Body to the list
          if(event.query['Body'].toLowerCase().trim() === 'start') {
            users.start(event.query['From'])
              .done(function(data) {
                client.send(event.query['From'], 'Thanks. Please reply with your name.', response);
              });
            return;
          } else {
            if(userStatus === -1) {
              client.send(event.query['From'], 'Please subscribe by texting "start" to this number.', response);
              return;
            } else if(userStatus === 0) {
              users.setName(event.query['From'], event.query['Body'].trim())
                .done(function(data) {
                  client.send(event.query['From'], 'You\'ve been subscribed to this group chat. Reply to send the group a message.', response);
                });
            } else if(userStatus === 1 && event.query['Body'].trim().length > 0) {
              var promises = [];
              var pcnt = 0;
              for(number in userList) {
                if(number == event.query['From']) {
                  console.log('Skipping ' + number);
                  continue;
                }
                client.send(number, client.constructBody(userList[event.query['From']], event.query['Body']), null);
              }
              response.send('Finished');
            }
          }
      }
    });
};