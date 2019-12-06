var express=require('express');
var fileUpload=require('express-fileupload');
var app=express();

const faceApi=require('./app.js');

faceApi.prepareModels().then(()=>{
	console.log('prepared');
	// faceApi.storeFaceDescriptors().then(()=>{
	// 	console.log('face descriptors stored');
	// })
});

app.use(fileUpload());

app.get('/',(req,res,next)=>{
	const routeList=
		'<h2>Face recognition api for iut-attendance project</h2>'+
		'<ul>'+
			'<li>GET /faces </li>'+
			'<li>GET /recognize </li>'+
			'<li>GET /models </li>'+
			'<li>POST /detect-faces </li>'+
		'</ul>'
	res.send(routeList);
})

app.get('/faces',(req,res,next)=>{
	console.log('sending faces');
	faceApi.run().then((response)=>{
		res.json(response);
	});
});

app.get('/recognize',(req,res,next)=>{
	console.log('recognizing');
	faceApi.recognizeById('u1710005').then((response)=>{
		res.send(response);
	});
	
});

app.get('/models',(req,res,next)=>{
	res.send(faceApi.displayModels());
});

app.post('/detect-faces',(req,res,next)=>{
	faceApi.detectFaces(req.files.photo).catch((err)=>{
		console.log('error occured while detecting faces: '+err);
	}).then((results)=>{
		console.log('done...');
		res.set('Content-Type','text/plain');
		res.send(results);
	});
});

/****      routes end     ***********/

app.use((req,res,next)=>{
	res.send('face-api application');
});



const port=process.env.PORT||3001;
app.listen(port);
console.log('now, server is working on ',port);