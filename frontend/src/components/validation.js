const validate = (value, rules) => {
    let isValid = true;

    for (let rule in rules) {
        switch(rule) {
            case 'validTime': isValid = isValid && timeValidator(value); break;       

            case 'isRequired': isValid = isValid && requiredValidator(value); break;

            
            default: isValid = true;
        }
    }

    return isValid;
}

//check against empty input value
const requiredValidator = value => {
    return (value.trim() !== '');
}

//check time input is valid
const timeValidator = value => {
    let re = new RegExp(/^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/);

    return (re.test(value));
}

export default validate;