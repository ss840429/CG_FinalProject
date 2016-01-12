
var gl;
var program;

var N = 5;  // The number of cubes will be (2N+1)^3

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [ 0, 0, 0 ];
var paused = 0;
var depthTest = 1;
var eyePosition = [ 0, 0, 2 ];

// event handlers for mouse input (borrowed from "Learning WebGL" lesson 11)
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

var moonRotationMatrix = mat4();

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
	lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseDown = false;
}

function handleMouseMove(event) {
    if (!mouseDown) {
      return;
    }

    var newX = event.clientX;
    var newY = event.clientY;
    var deltaX = newX - lastMouseX;
    var newRotationMatrix = rotate(deltaX/10, 0, 1, 0);

    var deltaY = newY - lastMouseY;
    newRotationMatrix = mult(rotate(deltaY/10, 1, 0, 0), newRotationMatrix);

    moonRotationMatrix = mult(newRotationMatrix, moonRotationMatrix);

    lastMouseX = newX
    lastMouseY = newY;
}

// event handlers for button clicks
function rotateX() {
	paused = 0;
    	axis = xAxis;
};
function rotateY() {
	paused = 0;
	axis = yAxis;
};
function rotateZ() {
	paused = 0;
	axis = zAxis;
};


// ModelView and Projection matrices
var modelingLoc, viewingLoc, projectionLoc, lightMatrixLoc;
var modeling, viewing, projection;

var volumeLoc;
var blockLoc;

var numVertices  = 36;

var pointsArray = [];
var colorsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var texture;

var texCoord = [
    vec2(0, 2),
    vec2(0, 0),
    vec2(1, 0),
    vec2(1, 2)
];

var vertices = [
	vec4( -0.5, -0.5,  0.5, 1 ),
	vec4( -0.5,  0.5,  0.5, 1 ),
	vec4(  0.5,  0.5,  0.5, 1 ),
	vec4(  0.5, -0.5,  0.5, 1 ),
	vec4( -0.5, -0.5, -0.5, 1 ),
	vec4( -0.5,  0.5, -0.5, 1 ),
	vec4(  0.5,  0.5, -0.5, 1 ),
	vec4(  0.5, -0.5, -0.5, 1 )
];

// Using off-white cube for testing
var vertexColors = [
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 ),  
	vec4( 0.0, 0.5, 0.8, 1.0 )
];

var lightPosition = vec4( 0.0, 10.0, 20.0, 1.0 );

var materialAmbient = vec4( 0.8, 0.8, 0.8, 1.0 );
var materialDiffuse = vec4( 0.8, 0.8, 0.8, 1.0);
var materialSpecular = vec4( 10.0, 0.0, 0.0, 1.0 );
var materialShininess = 12.0;

function configureTexture( image ) {
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function quad(a, b, c, d) {

     var t1 = subtract(vertices[b], vertices[a]);
     var t2 = subtract(vertices[c], vertices[b]);
     var normal = cross(t1, t2);  // cross returns vec3
     var normal = vec4(normal);
     normal = normalize(normal);

    pointsArray.push(vertices[a]); 
	 colorsArray.push(vertexColors[a]);
     normalsArray.push(normal); 
     texCoordsArray.push(texCoord[0]);
    pointsArray.push(vertices[b]); 
	 colorsArray.push(vertexColors[b]);
     normalsArray.push(normal); 
     texCoordsArray.push(texCoord[1]);
    pointsArray.push(vertices[c]); 
	 colorsArray.push(vertexColors[c]);
     normalsArray.push(normal);   
     texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[a]);  
	 colorsArray.push(vertexColors[a]);
     normalsArray.push(normal); 
     texCoordsArray.push(texCoord[0]);
    pointsArray.push(vertices[c]); 
	 colorsArray.push(vertexColors[c]);
     normalsArray.push(normal); 
     texCoordsArray.push(texCoord[2]);
    pointsArray.push(vertices[d]); 
	 colorsArray.push(vertexColors[d]);
     normalsArray.push(normal);
     texCoordsArray.push(texCoord[3]);	 
}


function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

var analyser;
var frequencyData = new Uint8Array();

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

 //=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
 // Experimenting with HTML5 audio
 
  var context = new AudioContext();
  var audio = document.getElementById('myAudio');
  var audioSrc = context.createMediaElementSource(audio);
  var sourceJs = context.createScriptProcessor(2048); // createJavaScriptNode() deprecated.
  

  analyser = context.createAnalyser();
  
  // we could configure the analyser: e.g. analyser.fftSize (for further infos read the spec)
    analyser.smoothingTimeConstant = 0.6;
	analyser.fftSize = 1024;

  // we have to connect the MediaElementSource with the analyser 
	audioSrc.connect(analyser);
	analyser.connect(sourceJs);
	sourceJs.buffer = audioSrc.buffer;
	sourceJs.connect(context.destination);
	audioSrc.connect(context.destination);

 	sourceJs.onaudioprocess = function(e) {
		// frequencyBinCount tells you how many values you'll receive from the analyser
		frequencyData = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(frequencyData);
	};

  //audio.play();
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	//
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

	// Generate pointsArray[], colorsArray[] and normalsArray[] from vertices[] and vertexColors[].
	// We don't use indices and ELEMENT_ARRAY_BUFFER (as in previous example)
	// because we need to assign different face normals to shared vertices.
	colorCube();
    
    // vertex array attribute buffer
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    // color array atrribute buffer
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    // normal array atrribute buffer

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // texture-coordinate array atrribute buffer

    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    //
    // Initialize a texture
    //
    var image = new Image();
    image.onload = function() { 
        configureTexture( image );
    }
//    image.src = "./bump.jpg";

	// uniform variables in shaders
    modelingLoc   = gl.getUniformLocation(program, "modelingMatrix"); 
    viewingLoc    = gl.getUniformLocation(program, "viewingMatrix"); 
    projectionLoc = gl.getUniformLocation(program, "projectionMatrix"); 
    lightMatrixLoc= gl.getUniformLocation(program, "lightMatrix"); 

	volumeLoc = gl.getUniformLocation(program, "volume");
	blockLoc  = gl.getUniformLocation(program, "block" );	

    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), 
       flatten(lightPosition) );
    gl.uniform4fv( gl.getUniformLocation(program, "materialAmbient"),
       flatten(materialAmbient));
    gl.uniform4fv( gl.getUniformLocation(program, "materialDiffuse"),
       flatten(materialDiffuse) );
    gl.uniform4fv( gl.getUniformLocation(program, "materialSpecular"), 
       flatten(materialSpecular) );	       
    gl.uniform1f( gl.getUniformLocation(program, "shininess"), materialShininess);

    gl.uniform1f( gl.getUniformLocation(program, "Neg"), 1.0 );
    gl.uniform1f( gl.getUniformLocation(program, "Shift"), 0.0 );

    //event listeners for buttons 
    document.getElementById( "xButton" ).onclick = rotateX;
    document.getElementById( "yButton" ).onclick = rotateY;
    document.getElementById( "zButton" ).onclick = rotateZ;
    document.getElementById( "pButton" ).onclick = function() {paused=!paused;};
    document.getElementById( "dButton" ).onclick = function() {depthTest=!depthTest;};
    document.getElementById( "music_apply" ).onclick = function() {
	var sel = document.getElementById('music');
	var text = "./music/" + sel.options[sel.selectedIndex].value;
	document.getElementById("myAudio").src = text ;
    }
//    document.getElementById( "url_apply" ).onclick = function() {
//	var text = document.getElementById( "utube" ).value ;
//	text = text.replace(/watch\?v\=/, "embed/") ;
//	document.getElementById( "ytplayer" ).src = text ; 
//    }
    document.getElementById( "enlarge" ).onclick = function() {
	gl.uniform1f( gl.getUniformLocation(program, "Neg"), 1.0 );
        gl.uniform1f( gl.getUniformLocation(program, "Shift"), 0.0 );
    }
    document.getElementById( "narrow" ).onclick = function() {
        gl.uniform1f( gl.getUniformLocation(program, "Neg"), -1.0 );
        gl.uniform1f( gl.getUniformLocation(program, "Shift"), 5.0 );
    }

	// event handlers for mouse input (borrowed from "Learning WebGL" lesson 11)
	canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    render();
};


function render() {
	modeling = mult(rotate(theta[xAxis], 1, 0, 0),
	                mult(rotate(theta[yAxis], 0, 1, 0),rotate(theta[zAxis], 0, 0, 1)));

	if (paused)	modeling = moonRotationMatrix;
	
	viewing = lookAt(eyePosition, [0,0,0], [0,1,0]);

	projection = perspective(45, 1.0, 1.0, 3.0);

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    if (! paused) theta[axis] += 2.0;
	if (depthTest) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);

    gl.uniformMatrix4fv( viewingLoc,    0, flatten(viewing) );
	gl.uniformMatrix4fv( projectionLoc, 0, flatten(projection) );
	gl.uniformMatrix4fv( lightMatrixLoc,0, flatten(moonRotationMatrix) );

	// update data in frequencyData
    analyser.getByteFrequencyData(frequencyData);

	// Uncomment the next line to see the frequencyData[] in the console
	//console.log(frequencyData)

  	var density = 1.0 ;
	var N2 = 2*N+1;
	var step = 1.0/N2;
	var size = step * 0.5;
	
	for (i=-N; i<=N; i+=density) {
		// render frame based on values in frequencyDat
//		if( i < 0 )
			gl.uniform1f( volumeLoc, frequencyData[Math.floor(256/N2)*(i+N)] /255 * N ) ;
			gl.uniform1f( gl.getUniformLocation(program, "volume1"), frequencyData[Math.floor(256/N2)*(i+N)] /255 * N );
//		else
//			gl.uniform1f( volumeLoc, frequencyData[Math.floor(256/N2)*(N-i)] /255 * N ) ;
		for (j=-N; j<=N ; j+=density) {
			for (k=-N; k<=N; k+=density) {	


			//	gl.uniform3f( blockLoc , i , j , k ) ;
				var dis = Math.abs( i*i + j*j + k*k ) ;
				var limit = N*N ;
				if( (!i&&!j&&!k) || Math.round( dis ) > limit ) continue ;
			
//				var cloned = mult(mult(translate(step*i, step*j, step*k), scale(0.12, 0.12, 0.12)), modeling);
				var cloned = mult(modeling, mult(translate(step*i, step*j, step*k), scale(size, size, size)));

				var ang = 45/4;

				//cloned = mult( cloned , rotate( 0 , 1 , 0 , 0  ) ) ;	
				//cloned = mult( cloned , rotate( 0 , 0 , 1 , 0  ) ) ;

				if( j == 0 )
					cloned = mult( cloned , rotate( k > 0 ? -90 : 90 , 1 , 0 , 0  ) ) ;
                                else if( k == 0 );
                                else if( j < 0 && k > 0 )
                                        cloned = mult( cloned , rotate( -(k+j)*ang-45.0 , 1 , 0 , 0  ) ) ;
                                else if( k < 0 && j < 0 )
                                        cloned = mult( cloned , rotate( -(k-j)*ang+45.0 , 1 , 0 , 0  ) ) ;
                                else if( k > 0 && j > 0 )
                                        cloned = mult( cloned , rotate( (k-j)*ang+45.0 , 1 , 0 , 0  ) ) ;
                                else
                                        cloned = mult( cloned , rotate( (k+j)*ang-45.0 , 1 , 0 , 0  ) ) ;

		
				if( i == 0 )
                                        cloned = mult( cloned , rotate( k > 0 ? -90 : 90 , 0 , 1 , 0  ) ) ;
				else if( k == 0 )
					 ;
                                else if( i < 0 && k > 0 )
                                        cloned = mult( cloned , rotate( (i+k)*ang+45.0 , 0 , 1 , 0  ) ) ;
                                else if( k < 0 && i < 0 )
                                        cloned = mult( cloned , rotate( -(i-k)*ang-45.0 , 0 , 1 , 0  ) ) ;
                                else if( k > 0 && i > 0 )
                                        cloned = mult( cloned , rotate( (i-k)*ang-45.0 , 0 , 1 , 0  ) ) ;
                                else
                                        cloned = mult( cloned , rotate( -(i+k)*ang+45.0 , 0 , 1 , 0  ) ) ;

				if( i == 0 )
					 cloned = mult( cloned , rotate( j > 0 ? -90 : 90 , 0 , 0 , 1  ) ) ;
				else if( j == 0 )
					cloned = mult( cloned , rotate( i > 0 ? 180 : 0 , 0 , 0 , 1  ) ) ;
				else if( i < 0 && j < 0 )
                                        cloned = mult( cloned , rotate( (i-j)*ang+45.0 , 0 , 0 , 1  ) ) ;
				else if( j > 0 && i < 0 )
					cloned = mult( cloned , rotate( -(i+j)*ang-45.0 , 0 , 0 , 1  ) ) ;
				else if( j > 0 && i > 0 )
					cloned = mult( cloned , rotate( -(i-j)*ang-135.0 , 0 , 0 , 1  ) ) ;
				else
					cloned = mult( cloned , rotate( (i+j)*ang+135 , 0 , 0 , 1  ) ) ;


				gl.uniformMatrix4fv( modelingLoc, 0, flatten(cloned) );
				gl.drawArrays( gl.TRIANGLES, 0, numVertices );
			}
		}
	}

    requestAnimFrame( render );
}
