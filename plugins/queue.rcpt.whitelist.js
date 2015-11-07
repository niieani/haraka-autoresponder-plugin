// enforces that emails not in users or autoresponders end up denied

'use strict';
exports.hook_queue = function(next, connection) {
  // basic logging so we can see if we have an email hitting the stack
  this.loginfo("New inbound email detected, handling");

  var users = this.config.get("auth_flat_file.ini", "ini").users;
  var autoresponders = this.config.get('queue.autoresponder.json', 'json') || {};

  // setup of variable to save us typing the same string over and over.
  var transaction = connection.transaction;

  for (let rcpt of transaction.rcpt_to) {
  	if (users[rcpt.user] === undefined && autoresponders[rcpt.user] === undefined) {
      this.loginfo("Unknown user %s", rcpt);
      return next(DENY, 'No such email: ' + rcpt.original);
    }
  }
  return next();
}
