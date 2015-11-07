// this enforces that when sending an email
// the FROM user exists in auth_flat_file or in the autoresponder list
// do adapt to your needs!

exports.hook_mail = function (next, connection, params) {
	var rcpt = params[0];
	var knownAddresses = this.config.get("auth_flat_file.ini", "ini").users;
  var userMap = this.config.get('queue.autoresponder.json', 'json') || {};
  this.loginfo("New email detected, handling user:" + rcpt.user);
	if (knownAddresses[rcpt.user] === undefined && userMap[rcpt.user] === undefined) {
		this.loginfo("Unknown recipient %s", rcpt);
    return next(DENY, "No such user");
	}
	return next();
}
