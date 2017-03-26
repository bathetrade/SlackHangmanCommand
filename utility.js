exports.setToString = function(set) {
	var ar = [];
	set.forEach(el => ar.push(el));
	return ar.sort().toString();
}

//TODO: should return indices and length of each sub pattern.
//Returns all indices of sub-pattern in source string. Returns null if there's no match, or if 'sourceString' is null.
exports.multiSearch = function(sourceString, regexPattern) {
	if (sourceString == null)
	{
		return null;
	}
	if (regexPattern == null)
	{
		return [0];
	}
	
	var savedIndex = regexPattern.lastIndex;
	regexPattern.lastIndex = 0;
	var match;
	var indices = [];

	while (match = regexPattern.exec(sourceString))
	{
		indices.push(match.index);
	}
	
	if (indices.length == 0)
	{
		indices = null;
	}
	
	regexPattern.lastIndex = savedIndex;
	
	return indices;
}