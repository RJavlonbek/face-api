var express=require('express');
var fileUpload=require('express-fileupload');
var app=express();

const faceApi=require('./app.js');

faceApi.prepareModels().then(()=>{
	console.log('prepared');
	faceApi.storeFaceDescriptors();
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
		res.set('Content-Type','image/jpeg');
		res.send(results);
	});
});

app.post('/recognize-faces',(req,res,next)=>{
	var photo=req.files.photo;
	var studentIds=['u1710005','u1710033'];
	//var studentIds=req.body.
	if(photo){
		faceApi.recognizeFaces(photo, studentIds).catch((err)=>{
			console.log('error occured while recognizing faces: '+err);
			res.json({
				result:'error',
				message:'error occured while recognizing faces: '+err
			});
		}).then((results)=>{
			console.log('done');
			res.json({
				results,
				result:'success'
			});
		});
	}else{
		res.json({
			result:'error',
			message:'no photo provided'
		});
	}
});

/****      routes end     ***********/

app.use((req,res,next)=>{
	res.send('face-api application');
});



const port=process.env.PORT||3001;
app.listen(port);
console.log('now, server is working on ',port);