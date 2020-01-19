//require('@tensorflow/tfjs-node');
const canvas=require('canvas');
const faceapi=require('face-api.js');
const fs = require("fs")  
const path = require("path")

const { Canvas, Image, ImageData } = canvas  
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const faceDetectionNet = faceapi.nets.ssdMobilenetv1

// SsdMobilenetv1Options
const minConfidence = 0.3;

// TinyFaceDetectorOptions
const inputSize = 408  
const scoreThreshold = 0.5

// MtcnnOptions
const minFaceSize = 50  
const scaleFactor = 0.8

function getFaceDetectorOptions(net) {  
    return net === faceapi.nets.ssdMobilenetv1
        ? new faceapi.SsdMobilenetv1Options({ minConfidence })
        : (net === faceapi.nets.tinyFaceDetector
            ? new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
            : new faceapi.MtcnnOptions({ minFaceSize, scaleFactor })
        )
}

const faceDetectionOptions = getFaceDetectorOptions(faceDetectionNet)

// simple utils to save files
const baseDir = path.resolve(__dirname, './out')  
function saveFile(fileName, buf) {  
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir)
    }
    // this is ok for prototyping but using sync methods
    // is bad practice in NodeJS
    fs.writeFileSync(path.resolve(baseDir, fileName), buf)
  }

async function prepareModels(){
    console.log('preparing models');
    // load weights
    await faceDetectionNet.loadFromDisk('./weights')
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./weights')
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./weights')
    await faceapi.nets.faceExpressionNet.loadFromDisk('./weights');
    await faceapi.nets.ageGenderNet.loadFromDisk('./weights');
}

async function run() {
    // load the image
    const img = await canvas.loadImage('./images/iut-jizzax-private.jpg')

    // detect the faces with landmarks
    const results = await faceapi.detectAllFaces(img, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender()
        .withFaceDescriptors();

    //console.log(results);
    // create a new canvas and draw the detection and landmarks
    const out = faceapi.createCanvasFromMedia(img);
    faceapi.draw.drawDetections(out, results.map(res => res.detection));
    faceapi.draw.drawFaceLandmarks(out, results.map(res => res.landmarks), { drawLines: true, color: 'red' });

    const minProbability = 0.05
    faceapi.draw.drawFaceExpressions(out, results, minProbability)

    results.forEach(result => {
        const { age, gender, genderProbability } = result
        new faceapi.draw.DrawTextField(
            [
                `${faceapi.round(age, 0)} years`,
                `${gender} (${faceapi.round(genderProbability)})`
            ],
            result.detection.box.topLeft
        ).draw(out);
    });

    // save the new canvas as image
    saveFile('faceLandmarkDetection.jpg', out.toBuffer('image/jpeg'));
    console.log('done, saved results to out/faceLandmarkDetection.jpg');
    return results;
}

async function recognize(){
    const REFERENCE_IMAGE='./images/iut-jizzax-private.jpg';
    const QUERY_IMAGE='./images/students/u1710005.jpg';

    const referenceImage = await canvas.loadImage(REFERENCE_IMAGE);
    const queryImage = await canvas.loadImage(QUERY_IMAGE);

    const resultsQuery = await faceapi.detectSingleFace(queryImage, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

    const resultsRef= await faceapi.detectAllFaces(referenceImage, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

    const labeledDescriptors=[
        new faceapi.LabeledFaceDescriptors('javlon',[resultsQuery.descriptor])
    ]

    const faceMatcher=new faceapi.FaceMatcher(resultsRef);

    const labels = faceMatcher.labeledDescriptors.map(ld => ld.label)
    const refDrawBoxes = resultsRef.map(res => res.detection.box).map((box, i) => {
        return new faceapi.draw.DrawBox(box, { label: labels[i] });
    });
    const outRef = faceapi.createCanvasFromMedia(referenceImage)
    refDrawBoxes.forEach(drawBox => drawBox.draw(outRef))

    saveFile('referenceImage.jpg', outRef.toBuffer('image/jpeg'))

    const bestMatch = faceMatcher.findBestMatch(resultsQuery.descriptor)
    const queryDrawBoxes = new faceapi.draw.DrawBox(resultsQuery.detection.box, { label: bestMatch.toString() });
    const outQuery = faceapi.createCanvasFromMedia(queryImage)
    queryDrawBoxes.draw(outQuery);
    saveFile('queryImage.jpg', outQuery.toBuffer('image/jpeg'))
    console.log('done, saved results to out/queryImage.jpg')

    //const bestMatch=faceMatcher.findBestMatch(resultsQuery.descriptor);
    return resultsQuery.descriptor;
}

async function recognizeById(studentId){
    if(studentId){
        const REFERENCE_IMAGE='./images/iut-jizzax-private.jpg';
        const QUERY_DESCRIPTOR='./images/students/'+studentId+'.json';

        const referenceImage = await canvas.loadImage(REFERENCE_IMAGE);

        const queryDescriptorJSON= JSON.parse(fs.readFileSync(path.resolve(__dirname, QUERY_DESCRIPTOR)));
        const queryDescriptor=new Float32Array(Object.values(queryDescriptorJSON));

        const resultsRef= await faceapi.detectAllFaces(referenceImage, faceDetectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();

        // const labeledDescriptors=[
        //     new faceapi.LabeledFaceDescriptors('javlon',[queryDescriptor])
        // ]


        const faceMatcher=new faceapi.FaceMatcher(resultsRef);

        const bestMatch = faceMatcher.findBestMatch(queryDescriptor);

        const labels = faceMatcher.labeledDescriptors.map(ld => {
            if(ld.label==bestMatch._label){
                return 'Javlon';
            }else{
                return ld.label;
            }
        });

        const refDrawBoxes = resultsRef.map(res => res.detection.box).map((box, i) => {
            return new faceapi.draw.DrawBox(box, { label: labels[i] });
        });
        const outRef = faceapi.createCanvasFromMedia(referenceImage)
        refDrawBoxes.forEach(drawBox => drawBox.draw(outRef))

        

        saveFile('referenceImage.jpg', outRef.toBuffer('image/jpeg'));

        

        //const bestMatch=faceMatcher.findBestMatch(resultsQuery.descriptor);
        return bestMatch;
    }
}

function storeFaceDescriptors(){
    const dirname=path.resolve(__dirname,'./images/students');
    const descriptorsDir=path.resolve(__dirname, './images/descriptors');

    fs.readdir(dirname, (err, studentImages)=>{
        studentImages.forEach((studentImage)=>{
            let studentId=studentImage.split('.')[0];
            fs.stat(path.resolve(descriptorsDir, studentId+'.json'), (err,exists)=>{
                if(err!==null){
                    console.log(studentId+' image found, and descriptor file not found, storing...');
                    storeFaceDescriptor(path.resolve(dirname, studentImage), path.resolve(descriptorsDir, studentId+'.json')).then(()=>{
                        console.log('stored...');
                    });
                }else if(err==null){
                    console.log(studentId+' descriptor found');
                }else{
                    console.log(err);
                }
            });
        });
    });

    async function storeFaceDescriptor(imageDir, jsonDir){
        const img=await canvas.loadImage(imageDir);
        const result=await faceapi.detectSingleFace(img, faceDetectionOptions).withFaceLandmarks().withFaceDescriptor();
        fs.writeFileSync(jsonDir, JSON.stringify(result.descriptor), "utf8");
    }
}

function displayModels(){
    return faceapi.nets;
}

// detect and draw faces to a picture which was sent by post request
async function detectFaces(photo){
    if(photo){
        console.log('detecting faces...');
        var img = new Image; // Create a new Image
        img.src = photo.data;

        console.log(img);
        const results = await faceapi.detectAllFaces(img, faceDetectionOptions)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors();

        const out = faceapi.createCanvasFromMedia(img);
        faceapi.draw.drawDetections(out, results.map(res => res.detection));
        faceapi.draw.drawFaceLandmarks(out, results.map(res => res.landmarks), { drawLines: true, color: 'red' });
        return out.toBuffer('image/jpeg');
    }
}

async function recognizeFaces(photo, studentIds){
    console.log('recognizing faces...');
    let results=[];

    // getting queried photo informations
    let img = new Image;
    img.src=photo.data;
    const queryResults = await faceapi.detectAllFaces(img, faceDetectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

    console.log('photo is analyzed...');

    // getting referenced informations (photo informations of given students)
    let labeledRefDescriptors=[];
    for(let i=0; i<studentIds.length; i++){
        let studentId=studentIds[i];
        let REF_DESCRIPTOR_FILE='./images/descriptors/'+studentId+'.json';
        let refDescriptorJSON=JSON.parse(fs.readFileSync(path.resolve(__dirname, REF_DESCRIPTOR_FILE)));
        let refDescriptor= new Float32Array(Object.values(refDescriptorJSON));

        labeledRefDescriptors.push(new faceapi.LabeledFaceDescriptors(studentId, [refDescriptor]));
    }

    console.log('student descriptors found...');

    // queried image canvas
    let queryCanvas=faceapi.createCanvasFromMedia(img);

    // create faceMatcher with referenced informations
    const faceMatcher= new faceapi.FaceMatcher(labeledRefDescriptors);

    // matching faces found in queried picture with faceMatcher
    console.log('finding matches...')
    queryResults.map((queriedFaceResult)=>{
        // find best match
        let bestMatch=faceMatcher.findBestMatch(queriedFaceResult.descriptor);
        results.push(bestMatch);
        // start drawing box
        return new faceapi.draw.DrawBox(queriedFaceResult.detection.box, {label: bestMatch.toString()});
    }).forEach((drawBox)=>drawBox.draw(queryCanvas));

    // save boxed query image
    const imageBuffer=queryCanvas.toBuffer('image/jpeg');
    //saveFile('boxedQueryImage.jpg', imageBuffer);
    //console.log('boxedQueryImage.jpg file saved...');

    return imageBuffer;

    // return {
    //     results,
    //     boxedImageBuffer:imageBuffer
    // };
}

module.exports={
    run,
    prepareModels,
    recognize,
    recognizeById,
    displayModels,
    storeFaceDescriptors,
    detectFaces,
    recognizeFaces
};