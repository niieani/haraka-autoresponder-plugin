// this checks whether the user exists in auth_flat_file or in the autoresponder list
// do adapt to your needs!

exports.hook_rcpt = function (next, connection, params) {
  this.loginfo("New inbound email detected, handling");
	var rcpt = params[0];
	var config = this.config.get("auth_flat_file.ini", "ini");
	var knownAddresses = config.users;
  var userMap = this.config.get('queue.autoresponder.json', 'json') || {};
	if (knownAddresses[rcpt.user] === undefined && userMap[rcpt.user] === undefined) {
		this.loginfo("Unknown recipient %s", rcpt);
    return next(DENY, "No such user.");
	}
	return next();
}
