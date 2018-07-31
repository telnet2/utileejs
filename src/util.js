function camelCaseString(snakeCase) {
    if (snakeCase) {
        const find = /(\_\w)/g;
        const convert = function (matches) {
            return matches[1].toUpperCase();
        };
        return snakeCase.replace(find, convert);
    };
    return snakeCase;
}

module.exports = {
    camelCaseString
}