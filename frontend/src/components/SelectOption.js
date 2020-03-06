import React from 'react'
import '../style/App.css'

const Select = props => {
    let formControl = 'form-control'

    if (props.touched && !props.valid) {
        formControl = 'form-control control-error';
    }

    const label = props.name.charAt(0).toUpperCase() + props.name.substring(1);

    return (
        <div className="form-group">
            {/* TODO: get rid of underscore */}
            <label>{label}</label> 
            <select className={formControl} value={props.value} onChange={props.onChange} name={props.name}>
                {props.options.map(option => (
                    <option value={option.value}> {option.display} </option>
                ))}
            </select>
        </div>
    );
}

export default Select;