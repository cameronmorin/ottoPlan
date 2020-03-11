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
    let re = new RegExp(/^\d{2}:\d{2}$/);

    return (re.test(value));
}

export default validate;