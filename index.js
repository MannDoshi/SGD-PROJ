const express = require('express');
const path = require('path');
const app = express();
const url = require('url');
const bodyParser = require('body-parser');
const axios = require('axios')
var neo4j = require('neo4j-driver');
var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'nirmit'));
var session = driver.session();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.get('/', async (req,res)=>{
    var arr = [];
    await session
    .run(`MATCH (n:Cases) RETURN n LIMIT 25`)
    .then(function(result){
        result.records.forEach(function(record){
            arr.push({
                id: record._fields[0].properties.case_id,
                lat: record._fields[0].properties.lat,
                long: record._fields[0].properties.lon
            })
            //console.log(record._fields[0].properties.case_id);
        })
    })
    .catch(function(err){
        console.log(err);
    })
    //console.log(arr);
    res.render('map', { cases : arr });
});

app.get('/filtercrimes', (req, res)=>{
    res.render('filtercrimes');
});

app.post('/filtercrimes',async (req,res)=>{
    var year = req.body.year;
    var month = req.body.month;
    var day = req.body.day;
    var crimetype = req.body.crimetype;
    var category = JSON.stringify(req.body.category);
    var district = req.body.district;
    let count = 0;
    var query = '';
    if(query.length == 0){
        if(year.length != 0){
            query = query + `MATCH (n:Cases)-[:IN_YEAR]->(y:Year{value:toInteger(${year})})`;
            year = '';
        }
        else if(month.length != 0){
            query = query + `MATCH (n:Cases)-[:IN_MONTH]->(m:Month{value:toInteger(${month})})`;
            month = '';
        }
        else if(day.length != 0){
            query = query + `MATCH (n:Cases)-[:ON_DAY]->(d:Day{value:toInteger(${day})})`;
            day = '';
        }
        else if(category.length != 0){
            query = query + `MATCH (n:Cases)-[:TYPE_OF]->(c:Category{name:${category}})`;
            category = '';
        }
        else if(district.length != 0){
            query = query + `MATCH (n:Cases)-[:AT]->(p:Place{district:toInteger(${district})})`;
            district = '';
        }
    }
    if(query.length != 0){
        if(month.length != 0){
            if(count == 0){
                query = query + ` WHERE EXISTS{ MATCH (n)-[:IN_MONTH]->(m:Month{value:toInteger(${month})}) }`
            }else{
                query = query + ` AND EXISTS{ MATCH (n)-[:IN_MONTH]->(m:Month{value:toInteger(${month})}) }`
            }
            count = count + 1;
            // query = query + ` WITH n MATCH (n)-[:IN_MONTH]->(m:Month{value:toInteger(${month})})`;
        }
        if(day.length != 0){
            if(count == 0){
                query = query + ` WHERE EXISTS{ MATCH (n)-[:ON_DAY]->(d:Day{value:toInteger(${day})}) }` 
            }else{
                query = query + ` AND EXISTS{ MATCH (n)-[:ON_DAY]->(d:Day{value:toInteger(${day})}) }`
            }
            
        }
        if(category.length != 0){
            if(count==0){
                query = query + ` WHERE EXISTS{ MATCH (n)-[:TYPE_OF]->(c:Category{name:${category}}) }` 
            }else{
                query = query + ` AND EXISTS{ MATCH (n)-[:TYPE_OF]->(c:Category{name:${category}}) }`
            }
            
        }
        if(district.length != 0){
            if(count==0){
                query = query + ` WHERE EXISTS{ MATCH (n)-[:AT]->(p:Place{district:toInteger(${district})}) }` 
            }else{
                query = query + ` AND EXISTS{ MATCH (n)-[:AT]->(p:Place{district:toInteger(${district})}) }`
            }
            
        }
    }

    // else{
    //     if(month.length != 0){
    //         query = query + ` WITH n MATCH (n)-[:IN_MONTH]->(m:Month{value:toInteger(${month})})`;
    //     }
    //     if(day.length != 0){
    //         query = query + ` WITH n MATCH (n)-[:ON_DAY]->(d:Day{value:toInteger(${day})})`;
    //     }
    // }

    if(query.length == 0){
        //res.render('filtercrimes');
    }
    else{
        query = query + ` RETURN n`;
    }
    console.log(query);
    

    var arr = [];
    await session
    .run(query)
    .then(function(result){
        result.records.forEach(function(record){
            arr.push({
                id: record._fields[0].properties.case_id,
                lat: record._fields[0].properties.lat,
                long: record._fields[0].properties.lon
            })
        })
    })
    .catch(function(err){
        console.log(err);
    })
    res.render('map', { cases : arr });
})

app.get('/filterlocation', (req,res)=>{
    res.render('location');
});

app.post('/filterlocation', async (req,res)=>{
    var arr=[];
    var pin = req.body.pincode;
    var radius = req.body.radius;
    var casenumber = req.body.casenumber;
    var coords = await geocode(pin);
    await session
    .run(`WITH  point({longitude:${coords[1]}, latitude:${coords[0]}}) AS p1
    MATCH (xc:Cases)
    WHERE distance(p1,point({longitude:xc.lon, latitude:xc.lat})) <= ${radius}
    RETURN xc
    ORDER BY distance(p1,point({longitude:xc.lon, latitude:xc.lat})) ASC
    LIMIT ${casenumber}`)
    .then(function(result){
        result.records.forEach(function(record){
            arr.push({
                id: record._fields[0].properties.case_id,
                lat: record._fields[0].properties.lat,
                long: record._fields[0].properties.lon
            })
        })
    })
    .catch(function(err){
        console.log(err);
    })
    console.log(coords);
    res.render('map', {cases:arr});
});

app.get('/filtercrimetype', (req, res)=>{
    res.render('crimetype')
});

app.post('/filtercrimetype', async (req,res)=>{
    var count=[];
    var category=[];
    var crimetype = req.body.crimetype;
    var districtnumber = req.body.districtnumber;
    // var coords = await geocode(pin);
    // console.log(coords);
    await session
    .run(`MATCH (c:Category{name:'${crimetype}'})<-[:TYPE_OF]-(xc:Cases)-[:AT]->(p:Place)
        RETURN p.district, COUNT(xc)
        ORDER BY COUNT(xc) DESC
        LIMIT ${districtnumber}`)
    .then(function(result){
        result.records.forEach(function(record){
            category.push({
                category: record._fields[0].low,
            })
            console.log(record._fields[0]);
        })
    })
    .catch(function(err){
        console.log(err);
    })
    await session
    .run(`MATCH (c:Category{name:'${crimetype}'})<-[:TYPE_OF]-(xc:Cases)-[:AT]->(p:Place)
        RETURN COUNT(xc), p.district
        ORDER BY COUNT(xc) DESC
        LIMIT ${districtnumber}`)
    .then(function(result){
        result.records.forEach(function(record){
            count.push({
                count: record._fields[0].low,
            })
            console.log(record._fields[0]);
        })
    })
    .catch(function(err){
        console.log(err);
    })
    res.render('filtercrimetype', {count: count, districts:category});
});

app.get('/statistics', (req,res)=>{
    res.render('statistics');
});

app.listen(8000, () => {
    console.log('Listening on port 8000. . .');
});

async function geocode(pin){
    var location = "";
    var coords = [];
    
    if (pin.length > 4 && pin.length<6) {
        location = pin + ",Chicago";
    }

    await axios.get('https://api.opencagedata.com/geocode/v1/json', {
        params: {
            q: location,
            key: '2c289f4ef5c54aea80a4af1777abf758'
        }
    })
    .then(function (response) {
        coords.push(response.data.results[0].geometry.lat);
        coords.push(response.data.results[0].geometry.lng);
        return coords;
    })
    .catch(function (e) {
        console.log(e);
    });
    return coords;
}