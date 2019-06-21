
export default class MkValidation {
  findSchemaIssues(val, schema={}, prefix=[], errors = {}){
    if (schema.items) {
      if (typeof val !== 'object' || Array.isArray(val)) {
        errors[prefix.join('.')] = "value should have items, but value is not an object"
      } else {
        Object.keys(schema.items).forEach(key=>{
          if (key in val) {
            this.findSchemaIssues(val[key], schema.items[key], prefix.concat(key), errors);
          } else {
            errors[prefix.concat(key).join('.')] = "value is not present"
          }
        })
      }
    }
    if ('exclusiveMaximum' in schema) {
      if (parseFloat(val) >= parseFloat(schema.exclusiveMaximum)) {
        errors[prefix.join('.')] = "value out of range, must be less than " + schema.exclusiveMaximum;
      }
    }
    if ('exclusiveMinimum' in schema) {
      if (parseFloat(val) <= parseFloat(schema.exclusiveMinimum)) {
        errors[prefix.join('.')] = "value out of range, must be greater than " + schema.exclusiveMinimum;
      }
    }
    if ('maximum' in schema) {
      if (parseFloat(val) > parseFloat(schema.maximum)) {
        errors[prefix.join('.')] = "value above range, must be less than or equal to " + schema.maximum;
      }
    }
    if ('minimum' in schema) {
      if (parseFloat(val) < parseFloat(schema.minimum)) {
        errors[prefix.join('.')] = "value out of range, must be greater than or equal to " + schema.minimum;
      }
    }
    return (Object.keys(errors).length > 0) ? errors : null;
  }
}
