require('@tensorflow/tfjs-node')
var express=require('express');
var fileUpload=require('express-fileupload');
const path=require('path');
const fs=require('fs');
const https=require('https');
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
	var photo=req.files.photo;
	const {lectureId}=req.body || {};
	var studentIds=['u1710005','u1710020','u1710032','u1710033','u1710037','u1710042','u1710046','u1710048','u1710056','u1710100','u1710113','u1710135','u1710146'];
	const DESCRIPTORS_DIR=path.join(__dirname, './images/descriptors');

	if(!(photo && lectureId)){ 
		return res.json({
			result:'error',
			message:'lack of data'
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
		}).then((result)=>{
			console.log('recognizing faces done, image was sent...');

			// sending request to iut-attendance API in order to mark found students attended
			attendance(result.facesData);

			// sending boxed image
			res.set('Content-Type','image/jpeg');
			res.send(result.boxedImageBuffer);

			// sending json
			// res.json({
			// 	...results,
			// 	result:'success'
			// });
		});
	});

	function attendance(data){
		console.log('requesting to iut-attendance...');
		data = JSON.stringify({
			data
		});
		const options = {
		  	hostname: 'iut-attendance.herokuapp.com',
		  	port: 443,
		  	path: '/api/lecture/attendance',
		  	method: 'POST',
		  	headers: {
		    	'Content-Type': 'application/json',
		    	'Content-Length': data.length
		  	}
		}
		const req = https.request(options, res => {
		  	console.log(`statusCode: ${res.statusCode}`)

		  	res.on('data', d => {
		  		console.log('request to iut-attendance finished...');
		    	process.stdout.write(d)
		  	});
		})

		req.on('error', error => {
		  	console.error(error)
		})

		req.write(data)
		req.end();
	}
});

/****      routes end     ***********/

app.use((req,res,next)=>{
	res.send('face-api application');
});



const port=process.env.PORT||3002;
app.listen(port);
console.log('now, server is working on ',port);