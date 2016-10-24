/// <reference path="jquery-1.11.3.min.js" />

//check if instance exists with same name

function IsInstanceExists(name,instancetocheck)
{
    //if exists then throw error
}

function Log(info) {
    console.log(info);
}
function isEmpty(obj) {
    //if (!Object.keys)
    //{
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
    return true;
    //}
    //else
    //return Object.keys(obj).length === 0;
}
function isString(s) {
    return typeof (s) === 'string' || s instanceof String;
}

//element is jquery element
function populateDropdown($element,array)
{
    var option = '';
    for (var i = 0; i < array.length; i++) {
        option += '<option value="' + array[i] + '">' + array[i] + '</option>';
    }
    $element.append(option);
}
//Object.prototype.toJsonString = function (allowFunctions) {
//    var $this = this;
//        var json = {};
//        for (var data in this) {
//            var obj = $this.data;
         
//            //add all objects except function
//            if (allowFunctions === true)
//            {
//                json[data] = obj;
//            }
//            else if (!isFunction(obj)) {
//                json[data] = obj;
//            }           
//        }
//        return json;
//}
Array.prototype.Contains = function (propertytoCheck,stringtoCheck) {
    var $this = this;
    var found = false;
    $.each($this, function (i, obj) {
        if(obj[propertytoCheck] == stringtoCheck)
        {
            found = true;
        }
    });
   // return $this.indexOf(stringtoCheck) > -1
    return found;
}

function isFunction(obj) {
    
    return obj !== null && typeof obj === 'function';
}
 //this excludes function
//function toJsonString(object) {        
//        var json = {};
//        for (var o in object) {
//            var obj = object[o];
//            //add all objects except function
//            if (!isFunction(obj)) {
//                json[o] = obj;
//            }
//        }
//        return json;
//}


function getUniqueID() {
    var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8; return v.toString(16); });
    return id;
}

function get4DigitUID() {
    
    return getUniqueID().substr(5,8);
}

function isDefined(value) { return typeof value !== 'undefined'; }
function isUndefined(value) { return typeof value === 'undefined'; }
function isArray(object) {
    if (object.constructor === Array) return true;
    else return false;
}
function getExistingObj(objArray, obj2, comparefields) {
    var retObj;
    //else they are not equal
    objArray.forEach(function (obj) {
        var validationCount = 0;// this should be equal to length of comparfields
        comparefields.forEach(function (field) {
            if (obj[field] === obj2[field]) {
                validationCount++;
            }
        });

        if (validationCount == comparefields.length) {
            retObj = obj;
            return false;
        }
    });
    return retObj;
}
function findAndGetObj(array, lookupproperty,lookupvalue)
{
    var returnObj;
    $.each(array, function (i, obj) {
        if (obj[lookupproperty] === lookupvalue) {
            returnObj = obj;
            return false;
        }
    });
    return returnObj;
}

function findAndRemove(array, property, value) {
    array.forEach(function (result, index) {
        if (result[property] === value) {
            //Remove from array
            array.splice(index, 1);
        }
    });
}


Array.prototype.GetUnique = function (fieldname) {
    var inputArray = this,val, outputArray = [];
    for (var i = 0; i < inputArray.length; i++) {
        val = inputArray[i][fieldname];
        if ((jQuery.inArray(val, outputArray)) == -1) {
            outputArray.push(val);
        }
    }
    return outputArray;
}

function uniqueValues(data, fields)
{
    var arr = [];
    $.each(data, function (i, row) {
        var obj = {};
        var canAdd = false;
        $.each(fields, function (j, f) {
            obj[f] = row[f];
        });
        canAdd = checkIfObjEqual(obj, arr);
        if (canAdd)
            arr.push(obj);
    });
}

function checkIfObjEqual(src, dest)
{

}

function isAggregatedField(field)
{
    var hasAgg = false;
    field = field.toLowerCase();
    if(field.indexOf('(') > -1 &&
        ( field.indexOf('sum') >-1 || field.indexOf('count') >-1 || field.indexOf('avg') >-1 || field.indexOf('min') >-1 || field.indexOf('max') >-1))
    {
        hasAgg = true;
    }
    return hasAgg;
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}