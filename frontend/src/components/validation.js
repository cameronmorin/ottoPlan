const validate = (value, rules) => {
    let isValid = true;

    for (let rule in rules) {
        switch(rule) {
            case 'isRequired': isValid = isValid && requiredValidator(value); break;

            case 'validTime': isValid = isValid && timeValidator(value); break;       
            
            default: isValid = true;
        }
    }

    return isValid;
}

const requiredValidator = value => {
    return (value.trim() !== '');
    //return false;
}

const timeValidator = value => {
    let re = new RegExp(/^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/);

    return (re.test(value));
}

export default validate;