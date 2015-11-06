// autoresponder

// documentation via: haraka -c /haraka -h plugins/autoresponder

// Put your plugin code here
// type: `haraka -h Plugins` for documentation on how to create a plugin

var outbound = require('./outbound');
var mailcomposer = require('mailcomposer');

exports.hook_queue = function (next, connection) {
	var userMap = this.config.get('queue.autoresponder.json', 'json') || {};
	
    // basic logging so we can see if we have an email hitting the stack
    this.loginfo("New inbound email detected, handling");

    // setup of variable to save us typing the same string over and over.
    var transaction = connection.transaction;
    var receivedDate = transaction.header.headers.date;
    var subjectLine = transaction.header.headers.subject;

    this.loginfo({
        email: transaction.mail_from,
        message: transaction.data_lines,
        received: receivedDate,
        subjectLine: subjectLine
	});

	if (transaction.rcpt_to.length > 0 && userMap.hasOwnProperty(transaction.rcpt_to[0].user) && transaction.rcpt_to[0].user != transaction.mail_from.original) {
		var mailObj = userMap[transaction.rcpt_to[0].user];

		if (!mailObj.hasOwnProperty('from'))
			mailObj.from = transaction.rcpt_to[0].original;

		mailObj.to = transaction.mail_from.original;
		var messageIds = connection.transaction.header.get_all('Message-Id');
		if (messageIds.length > 0)
			mailObj.inReplyTo = messageIds[0];

		var mail = mailcomposer(mailObj);

		var outnext = (code, msg) => {
			switch (code) {
				case DENY: this.logerror("Sending mail failed: " + msg);
                    break;
				case OK: this.loginfo("Autoreply sent");
                    next();
                    break;
				default: this.logerror("Unrecognised return code from sending email: " + msg);
                    next();
			}
		};

		mail.build((err, message) => {
			if (!err) {
				this.loginfo(mailObj);
				// this.loginfo(message.toString());
				this.loginfo('Sending auto-response');
				outbound.send_email(mailObj.from, mailObj.to, message.toString(), outnext);
			}
			else this.logerror('Unable to generate auto-response: ' + err);
			next();
		});
	}
	else {
		// passes control over to the next plugin within Haraka.
		next(OK);
	}
}