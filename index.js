var express=require('express');
var app=express();

const faceApi=require('./app.js');

faceApi.prepareModels();

app.get('/faces',(req,res,next)=>{
	console.log('sending faces');
	faceApi.run().then((response)=>{
		res.json(response);
	});
	
});

app.use((req,res,next)=>{
	res.send('face-api application');
});

const port=process.env.PORT||3001;
app.listen(port);
console.log('now, server is working on ',port);