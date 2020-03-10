const validate = (value, rules) => {
    let isValid = true;

    for (let rule in rules) {
        switch(rule) {
            case 'isRequired': isValid = isValid && requiredValidator(value); break;
            
            default: isValid = true;

            //add more requirements here
        }
    }

    return isValid;
}

/**
 * Check to confirm that feild is required
 * 
 * @param  value 
 * @return       
 */
//makes sure there is something entered if question is required
const requiredValidator = value => {
    return (value.trim() !== '');
    //return false;
}

export default validate;