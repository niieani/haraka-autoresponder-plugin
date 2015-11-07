// autoresponder

// documentation via: haraka -c /haraka -h plugins/autoresponder

// Put your plugin code here
// type: `haraka -h Plugins` for documentation on how to create a plugin

var outbound = require('./outbound');
var mailcomposer = require('mailcomposer');
var FifoArray = require('fifo-array');
var respondedTo = new FifoArray(1000);

exports.hook_queue = function(next, connection) {
  var userMap = this.config.get('queue.autoresponder.json', 'json') || {};

  // basic logging so we can see if we have an email hitting the stack
  this.loginfo("New inbound email detected, handling");

  // setup of variable to save us typing the same string over and over.
  var transaction = connection.transaction;
  var receivedDate = transaction.header.headers.date;
  var subjectLine = transaction.header.headers.subject;
/*
  this.loginfo({
    email: transaction.mail_from,
    message: transaction.data_lines,
    received: receivedDate,
    subjectLine: subjectLine
  });
*/
  if (respondedTo.indexOf(transaction.mail_from.original) > -1) {
    return next(DENY, 'Too many emails, too soon!');
  }
  if (transaction.rcpt_to.length > 0 &&
			userMap.hasOwnProperty(transaction.rcpt_to[0].user) &&
			transaction.rcpt_to[0].original != transaction.mail_from.original) {

		respondedTo.push(transaction.mail_from.original);

    var mailObj = userMap[transaction.rcpt_to[0].user];

    if (!mailObj.hasOwnProperty('from'))
      mailObj.from = transaction.rcpt_to[0].original;

    mailObj.to = transaction.mail_from.original;
    var messageIds = connection.transaction.header.get_all('Message-Id');
    if (messageIds.length > 0)
      mailObj.inReplyTo = messageIds[0];

    var mail = mailcomposer(mailObj);

    mail.build((err, message) => {
      if (!err) {
        // this.loginfo(mailObj);
        // this.loginfo(message.toString());
        this.loginfo('Sending auto-response');
        outbound.send_email(mailObj.from, mailObj.to, message.toString(), (code, msg) => {
		      switch (code) {
		        case DENY: this.logerror("Sending mail failed: " + msg); return next(DENY); break;
		        case OK: this.loginfo("Autoreply sent"); return next(OK); break;
		        default: this.logerror("Unrecognised return code from sending email: " + msg); return next(DENY);
		      }
		    });
      }
      else {
				this.logerror('Unable to generate auto-response: ' + err);
				return next(DENY, "Something strange has happened.");
			}
    });
  } else {
    // passes control over to the next plugin within Haraka.
    return next();
  }
}
