//require('@tensorflow/tfjs-node');
var express=require('express');
var fileUpload=require('express-fileupload');
const path=require('path');
const fs=require('fs');
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
			'<li>POST /recognize-faces </li>'+
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
	console.log('recognize-faces requested');
	req.setTimeout(600000);
	var photo=req.files ? req.files.photo : null;
	var studentIds=['u1710005','u1710020','u1710032','u1710033','u1710037','u1710042','u1710046','u1710048','u1710056','u1710100','u1710113','u1710135','u1710146'];
	const DESCRIPTORS_DIR=path.join(__dirname, './images/descriptors');

	if(!photo){ 
		res.json({
			result:'error',
			message:'no photo provided'
		});
	}

	fs.readdir(DESCRIPTORS_DIR, (err, files)=>{
		//console.log(files);
		studentIds=files.map((file, index)=>{
			return file.split('.')[0];
		});
		console.log('list of students is found...');

		faceApi.recognizeFaces(photo, studentIds).catch((err)=>{
			console.log('error occured while recognizing faces: '+err);
			res.json({
				result:'error',
				message:'error occured while recognizing faces: '+err
			});
		}).then((results)=>{
			console.log('recognizing faces done, image was sent...');

			// sending boxed image
			// res.set('Content-Type','image/jpeg');
			// res.send(results);

			// sending json
			res.json({
				...results,
				result:'success'
			});
		});
	});

	
});

/****      routes end     ***********/

app.use((req,res,next)=>{
	res.send('face-api application');
});



const port=process.env.PORT||3001;
app.listen(port);
console.log('now, server is working on ',port);