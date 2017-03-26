var date = new Date();
exports.log = function(txt) {
	console.log(`[${date.toUTCString()}] ${txt}`);
}