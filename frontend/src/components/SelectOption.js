import React from 'react'
import '../style/App.css'

const SelectOption = props => {
    let formControl = 'form-control'
    let showError = false;

    if (!props.formValid && !props.valid) {
        formControl = 'form-control control-error';
        showError = true;
    }

    const label = props.name.charAt(0).toUpperCase() + props.name.substring(1);

    return (
        <div className="form-group">
            {/* TODO: get rid of underscore */}
            <label>{label}</label> 
            {showError ? <label  style={{ color: 'red', fontSize: '10px'}}>&nbsp;&nbsp;&nbsp;*Required</label> : null}
            <select className={formControl} value={props.value} onChange={props.onChange} name={props.name}>
                <option disabled hidden selected> Select an option... </option>
                {props.options.map(option => (
                    <option value={option.value}> {option.label} </option>
                ))}
            </select>
        </div>
    );
}

export default SelectOption;