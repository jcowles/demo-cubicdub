    var gl;
    var DEBUG_MODE = false;
    var RENDER_MODE = false;
    var MENV_MODE = false;
    var RENDER_FPS = 30;
    var hadError = false;
    // everything is in milliseconds, so SPF is actually a bad name
    var RENDER_SPF = 1 / RENDER_FPS * 1000;
    var canvas;
 
    
    function initGL(canvas) {
        //try {
            if (!DEBUG_MODE) 
                gl =WebGLUtils.setupWebGL(canvas, { antialias: false,
                                  stencil: true } );
            else
                gl =WebGLDebugUtils.makeDebugContext(canvas.getContext("experimental-webgl"));

        //} catch (e) { }
        if (!gl) {
            alert("Could not initialize WebGL -- please visit http://get.webgl.org/ for help.");
            hadError = true;
            return;
        }

        if (gl && (!gl.getExtension("OES_texture_float") || !gl.getExtension("OES_texture_float_linear"))) {
            alert("Browser fail: floating point textures not supported :(");
            gl = null;
        }

        if (gl) {
            gl.viewportWidth = canvas.clientWidth;
            gl.viewportHeight = canvas.clientHeight;
        }
    }
 
    var shader;
    var shaderProgram;
    var depthShader;
    var bltShader;
    var copyShader;
    var grainShader;
    var schShader;
    var partShader;
 
    function initShaders() {
        var uniforms = [ "time", 
                        //"doTex", 
                        "doWave", 
                        "tex0", 
                        "uPMatrix", 
                        "uMVMatrix", 
                        "uNMatrix",
                        "res"
                        ];

        var attribs = [  "aVertexPosition",
                        "aVertexColor",
                        "aVertexUV",
                        "aVertexNormal" 
                        ];

        shader = new Lab.Shader("displace-fs", "displace-vs", uniforms, attribs);
        
        shader.init(gl);
        shader.prog.vertex  = shader.prog.aVertexPosition;
        shader.prog.color   = shader.prog.aVertexColor;
        shader.prog.uv      = shader.prog.aVertexUV;
        shader.prog.normal  = shader.prog.aVertexNormal;
        shaderProgram = shader.prog;

        uniforms    = [
                        "time", 
                        //"doTex", 
                        "uPMatrix", 
                        "uMVMatrix", 
                        "uNMatrix",
                    ];
        attribs     = [
                        "aVertexPosition",
                    ];
        depthShader = new Lab.Shader("depth-fs", "depth-vs", uniforms, attribs);
        depthShader.init(gl);
        depthShader.prog.vertex  = depthShader.prog.aVertexPosition;
        //shader.bind(gl);

        uniforms = [ "tex0" ];
        attribs  = [ "vertex" ];
        schShader = new Lab.Shader("schmutz-fs", "schmutz-vs", uniforms, attribs);
        schShader.init(gl);

        uniforms = [  "debug", "init", "time", "dt", "mode", "tex0", "tex1", "tex2", "tex3", "doAttract" ];
        attribs  = [ "vertex" ];
        partShader = new Lab.Shader("particle-fs", "particle-vs", uniforms, attribs);
        partShader.init(gl);
    }
 
    var mvMatrix = mat4.create();
    var mvMatrixStack = [];
    var pMatrix = mat4.create();
    var tempMat4 = mat4.create();
 
    function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }
 
    function mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }
 
    function setMatrixUniforms(prog) {
        gl.uniformMatrix4fv(prog.uPMatrix, false, pMatrix);
        gl.uniformMatrix4fv(prog.uMVMatrix, false, mvMatrix);

        var normalMatrix = mat3.create();
        mat4.toInverseMat3(mvMatrix, normalMatrix);
        mat3.transpose(normalMatrix);
        gl.uniformMatrix3fv(prog.uNMatrix, false, normalMatrix);
    }
 
    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
 
    var grid = new Lab.Grid();
    var cubes = new Lab.Geom.Cubes();
    var cube = new Lab.Geom.Cubes();
    var field = new Lab.Field(150, 150); //1024, 428);
    var bloom = new Lab.Bloom(1024, 428);
    var particleField = new Lab.ParticleField(150, 150);
    var particleField2 = new Lab.ParticleField(150, 150);
    var grainTex = new Lab.Texture(1024, 428);
    var noiseTex = new Lab.Texture(150, 150);
    //var curves = new Lab.Curves();
    var quad;

    //
    // TODO: Move these into classes
    //
    var cam = {};

    var render = {};
    render.sep = [0,0];
    render.res = 1000;
    render.schmutz = false;
    render.cam = {};
    render.time = {};
    render.time.scale = 1.0;
    render.time.value = 0.0;
    render.bloom = true;
    render.colorSep = true;
    render.vignette = true;
    render.doWave = false;
    render.doAttract = false;
    render.updateField = false;
    render.posTex = null;
    render.grain = true;
    render.invert = false;
    render.zClip = 1000;


    // number of cubes in x and y directions
    var cx = 150, cy = 150;

    // need #pixles = #cubes * 8, where each pixel maps to
    // a vertex providing the location of the cube
    // N = cx * cy * 8 = cx * cy * 2 * 2 * 2 = (cy * 4) * (cx * 2)
    var fbo = new Lab.Fbo(cx*2, cy*2); //512,512); //cx*2, cy*4);
    var ppFinal; //cx*2, cy*4);
    var acc;

    function initBuffers() {
        noise = new ClassicalNoise();
        grid.init(gl);
        fbo.init(gl);
        quad =  Lab.Geom.makeQuad2D(gl);

        copyShader = new Lab.Shader("copy-fs", "copy-vs", ["tex0"], ["vertex"]);
        copyShader.init(gl);

        grainShader = new Lab.Shader("grain-fs", "grain-vs", ["tex0", "time"], ["vertex"]);
        grainShader.init(gl);

        bltShader = new Lab.Shader("blt-fs", "blt-vs", bloom.blt.uniforms, bloom.blt.attribs);
        bltShader.init(gl);
        ppFinal = new Lab.PingPongBuffer(1024,428, bltShader.prog.tex0)
        ppFinal.init(gl);
        ppFinal.inputSrc = false;
        var blurShader = new Lab.Shader("blur-fs", "blur-vs", bloom.blur.uniforms, bloom.blur.attribs);
        blurShader.init(gl);
        bloom.init(gl, bltShader, blurShader);

        //
        // simple decay field
        //
        var tempShader = new Lab.Shader("field-fs", "field-vs", field.uniforms, field.attribs);
        tempShader.init(gl);
        /*
        var initPattern = new Float32Array(field.width*field.height*4);
        for (var x = 0; x < field.width; x++) {
            for (var y = 0; y < field.height; y++) {
                var xv = (x/(field.width-1)-.5)*2
                var yv = (y/(field.height-1)-.5)*2
                var s = .7*Math.cos(xv*Math.PI);
                var idx = (y*field.width + x)*4;
                if (s < yv+.1 && s > yv-.3) {
                    initPattern[idx]   =  .0; // R
                    initPattern[idx+1] =  .0; // G
                    initPattern[idx+2] =  .0; // B
                    initPattern[idx+3] = 15.0; // A
                } else {
                    initPattern[idx]   = .0;
                    initPattern[idx+1] = .0;
                    initPattern[idx+2] = .0;
                    initPattern[idx+3] = .0;
                }
            }
        }*/

        field.init(gl, tempShader, textData, true); //initPattern);

        //
        // particle field
        //
        var positions = new Float32Array(particleField.width*particleField.height*4);
        var velocities= new Float32Array(particleField.width*particleField.height*4);
        var accelerations= new Float32Array(particleField.width*particleField.height*4);
        var upSpeed = 8;
        for (var x = 0; x < particleField.width; x++) {
            for (var y = 0; y < particleField.height; y++) {
                var loc = 4*(x*particleField.width+y);
                positions[loc+0] = .0*y;
                positions[loc+1] = .0*x;
                positions[loc+2] = 0; //
                positions[loc+3] = 1.0; //(x*y / (particleField.width*particleField.height));;

                var r = Math.random()*upSpeed;
                r *= 1;
                velocities[loc+0] = 0;//r; //0.00000;
                velocities[loc+1] = 0;//r; //0.00000;
                velocities[loc+2] = r //0.1;
                velocities[loc+3] = 1.0;

                accelerations[loc+0] = (noise.noise(x/particleField.width*12, 
                                             y/particleField.height*5,0)) * 500;
                accelerations[loc+1] = (noise.noise(x/particleField.width*37, 
                                             y/particleField.height*7,0)) * 500;
                accelerations[loc+0] = 0;
                accelerations[loc+1] = 0;
                accelerations[loc+2] = r;
                accelerations[loc+3] = 0;
            }
        }
        acce = accelerations;
        particleField.init(gl, partShader, partShader, positions, velocities, accelerations);
        for (var x = 0; x < particleField.width; x++) {
            for (var y = 0; y < particleField.height; y++) {
                var loc = 4*(x*particleField.width+y);
                positions[loc+0] = .0*y;
                positions[loc+1] = .0*x;
                positions[loc+2] = 0; //
                positions[loc+3] = 1.0; //(x*y / (particleField.width*particleField.height));;

                var r = Math.random()*upSpeed;
                r *= 1;
                velocities[loc+0] = 0;//r; //0.00000;
                velocities[loc+1] = 0;//r; //0.00000;
                velocities[loc+2] = r //0.1;
                velocities[loc+3] = 1.0;

                accelerations[loc+0] = (noise.noise(x/particleField.width*13, 
                                             y/particleField.height*9,0)) * 500;
                accelerations[loc+1] = (noise.noise(x/particleField.width*33, 
                                             y/particleField.height*11,0)) * 500;
                accelerations[loc+0] = 0;
                accelerations[loc+1] = 0;
                accelerations[loc+2] = r;
                accelerations[loc+3] = 0;
            }
        }
        acce = accelerations;
        particleField2.init(gl, partShader, partShader, positions, velocities, accelerations);

        //
        // Grain texture
        //
        var grain = new Float32Array(grainTex.width * grainTex.height);
        for (var x = 0; x < grainTex.width; x++) {
            for (var y = 0; y < grainTex.height; y++) {
                var loc = (x*grainTex.height+y);
                var r = Math.random();
                grain[loc] = (r > .80) ? (r*.036) : 0;
            }
        }
        grainTex.init(gl, grain, gl.ALPHA, gl.ALPHA);

        //
        // Cube grid
        //
        var noisy = new Float32Array(noiseTex.width * noiseTex.height*3);
        for (var x = 0; x < cx; x++) {
            for (var y =0; y < cy; y++) {
                n = noise.noise(x/cx*24,y/cy*24,0);
                nx = noise.noise(x/cx*77,y/cy*84,0);
                ny = noise.noise(x/cx*51,y/cy*62,0);
                noisy[(x*noiseTex.width+y)*3+0] = nx*80;
                noisy[(x*noiseTex.width+y)*3+1] = ny*80;
                noisy[(x*noiseTex.width+y)*3+2] = (n+1)*.5*80;
                cubes.push(x,y,0,.35 + .45*n,cx,cy);
                //cubes.push(x,y,0,.1+Math.random()*.5,cx,cy);
                //cubes.push(x,y,0,0.2,cx,cy);
            }
        }
        cubes.init(gl);
        noiseTex.init(gl, noisy, gl.RGB, gl.RGB);

        //
        // Pair of dancing cubes
        //
        cube.push(5,0,0,3.0,1,1);
        cube.push(-5,0,0,3.0,1,1);
        cube.init(gl);


        //curveDrawShader = new Lab.Shader("curveDraw-fs", "curveDraw-vs", ["tex0", "time"], ["vertex"]);
        //curveDrawShader.init(gl);
        //curveUpdateShader = null; //new Lab.Shader("curveUpdate-fs", "curveUpdate-vs", ["tex0"], ["vertex"]);
        //curveUpdateShader.init(gl);

        //           x0  y0  x1   y1  shift amp velocity width
        for (i = 0; i < 1000; i++) {
            var r = Math.random();
            var r2 = Math.random();
            var r3 = Math.random();
            var r4 = Math.random();
           //curves.push(.25, .5, .75, .5,   r3*10000,   1,    1,     .2  ); 
        }

        //curves.init(gl, curveDrawShader, curveUpdateShader);
    
    } 
 
    var rTri = 0;

    function drawFbo(shd, backFacing) {
        fbo.bind(gl);
        
        // setup the off-screen projection & viewport
        mat4.perspective(45, fbo.width / fbo.height, 10.0, 4000.0, pMatrix);

        mat4.translate(mvMatrix, [0, 0, -60]);
        
        // rotate and twist
        //mat4.rotate(mvMatrix, degToRad(lastTime/10), [1, 1, 0]);
        //mat4.rotate(mvMatrix, degToRad(lastTime/10), [0, 0, 1]);

        // spin
        mat4.rotate(mvMatrix, degToRad(45), [0, 0, 1]);
        mat4.rotate(mvMatrix, degToRad(lastTime/10), [1, 0, 0]);
        mat4.rotate(mvMatrix, degToRad(lastTime/10), [0, 1, 0]);
 
        setMatrixUniforms(shd.prog);

        gl.enable(gl.CULL_FACE);
        if (backFacing) {
            // we actually want the back-facing primitives to make it
            // easier to visualize, so set the front faces to cull
            gl.cullFace(gl.FRONT);
            particleField2.attract.bind(gl);
        } else {
            gl.cullFace(gl.BACK);
            particleField.attract.bind(gl);
        }

        gl.disable(gl.DEPTH_TEST);
        //curves.draw(gl, lastTime);
        gl.enable(gl.DEPTH_TEST);
        cube.draw(gl, shd.prog);

        fbo.bind(gl);
        gl.disable(gl.DEPTH_TEST);
        //curves.draw(gl, lastTime);
        gl.enable(gl.DEPTH_TEST);
        shd.bind(gl);
        cube.draw(gl, shd.prog);
        gl.cullFace(gl.BACK);

        fbo.unbind(gl);
    }
 
    function drawGuide(shd) {
        // 
        // Draw the guide for the off-screen depth pass
        //
        //gl.uniform1i(shd.prog.doTex, 0);
        gl.uniform1f(shd.prog.res, 1000);
        setMatrixUniforms(shader.prog);
        cube.draw(gl, shd.prog);
    }

    function drawScreenCubes(shd,x,y,z,rx,ry,rz) {
        mvPushMatrix();
        mat4.rotate(mvMatrix, degToRad(ry), [0, 1, 0]);
        mat4.rotate(mvMatrix, degToRad(rz), [0, 0, 1]);
        mat4.rotate(mvMatrix, degToRad(rx), [1, 0, 0]);
        mat4.translate(mvMatrix, [x, y, z]);

        //gl.uniform1i(shd.prog.doTex, 1);
        gl.uniform1i(shd.prog.doWave, render.doWave ? 1 : 0);
        gl.uniform1i(shd.prog.tex0, 0)
        gl.uniform1f(shd.prog.res, render.res);

        setMatrixUniforms(shader.prog); 

        cubes.draw(gl, shd.prog);

        gl.bindTexture(gl.TEXTURE_2D, null);
        //gl.uniform1i(shd.prog.doTex, 0);
        mvPopMatrix();
    }

    cam.loc = vec3.create([0,0,0]);
    cam.center = vec3.create([0,0,-50]);
    cam.up = vec3.create([0,1,0]);

    var inputs = {};
    function drawScene() {
        anim.getShot().onDraw(lastTime, lastTimeDelta);

        //gl.clear(gl.COLOR_BIT | gl.DEPTH_BIT);
        //curves.draw(gl, lastTime);
        //return;

        //cam.loc = vec3.create([0.03*Math.sin(lastTime),0,0]);
        //cam.loc[0] = 50*Math.cos(lastTime/800);
        //cam.loc[2] = 50*Math.sin(lastTime/800);

        //render.res = 1000; //lastTime/4000); //1.+(.5*Math.sin(lastTime/1000.)+.6)*150.;
        //render.res = Math.min(1000, render.res+.2); //lastTime/4000); //1.+(.5*Math.sin(lastTime/1000.)+.6)*150.;
        /*
        if (render.time.scale != 0.5001)
            if (render.time.scale > 25) {
                render.time.scale = 0.1001;
                cam.loc[2] -= 20;
                cam.loc[2] += 10;
            } else {
                render.time.scale += 0.1;
            }
        */
        //render.res = 1.+(.5*Math.sin(lastTime/1000.)+.6)*150.;

        particleField.update(gl, lastTime, lastTimeDelta/1000, render.doAttract ? 1 : 0);
        particleField2.update(gl, lastTime, lastTimeDelta/1000, render.doAttract ? 1 : 0);

        /* DEBUG FIELD OUTPUT
        //field.update(gl, lastTime, 0);
        gl.uniform1i(particleField.pos.shader.prog.mode, 1);

        // clear main screen buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        particleField.pos.render(gl, lastTime, lastTimeDelta/1000, true);
        //field.render(gl, lastTime, 0, true);
        return;
        */


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var shd = shader; 
        shd = depthShader;
        shd.bind(gl);
        //gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
 
 
        mat4.identity(mvMatrix);
 
        //mat4.translate(mvMatrix, [-70.5, -70.0, 130.0]);
        //mat4.translate(mvMatrix, [-1.5, 0.0, -17.0]);


        // 1
    mvPushMatrix();
        inputs.x = inputs.x || document.getElementById("x");
        inputs.y = inputs.y || document.getElementById("y");
        inputs.z = inputs.z || document.getElementById("z");
        inputs.rx = inputs.rx || document.getElementById("rx");
        inputs.ry = inputs.ry || document.getElementById("ry");
        inputs.rz = inputs.rz || document.getElementById("rz");
    x = parseFloat(inputs.x.value);
    y = parseFloat(inputs.y.value);
    z = parseFloat(inputs.z.value);
    rx = parseFloat(inputs.rx.value);
    ry = parseFloat(inputs.ry.value);
    rz = parseFloat(inputs.rz.value);
    // 2
        mvPushMatrix();


        //
        // Depth Pass
        //

        // 3
        mvPushMatrix();
        // 4
        mvPushMatrix();

        //
        // update the position/velocity/acceleration
        //

        Lab.trace("Field", function() {
            if (render.updateField) {
                field.shader.bind(gl);
                field.update(gl, lastTime, 0.5);
            }
        });

        Lab.trace("Viewport", function() {
            gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        });
        

        // add the output of the field render to the 
        // pseudo-depth buffer in the fbo
        Lab.trace("Cubes/Particles", function() {
            fbo.bind(gl);
            fbo.clear(gl);
            particleField.attract.bind(gl);
            particleField.attract.clear(gl);
            //gl.disable(gl.DEPTH_TEST);
            //field.shader.bind(gl);
            //field.render(gl, lastTime, 0.5,true);
            //gl.enable(gl.DEPTH_TEST);

            shd.bind(gl);
            drawFbo(shd, false);
        });

        //
        // Switch to screen buffer
        //

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        //mat4.ortho(45, gl.viewportWidth / gl.viewportHeight, 0.1, render.zClip, pMatrix);
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, render.zClip, pMatrix);
        shd = shader;
        shd.bind(gl);
        setMatrixUniforms(shd.prog);

        gl.uniform1f(shd.prog.time, lastTime);

        //
        // Draw the guide to visualize input
        //
        //drawGuide(shd);

        // 3
    mvPopMatrix();

        mvPushMatrix();
        Lab.trace("lookAt", function() {
            // camera    loc      center    up      dest
            mat4.lookAt(cam.loc, cam.center, cam.up, mvMatrix);
        });


        Lab.trace("drawScreenCubes", function() {
            //
            // Draw the on-screen buffer
            //
            ppFinal.bind(gl);
            ppFinal.fbo.clear(gl);

            // bind positioning texture
            gl.activeTexture(gl.TEXTURE0);
            var t = lastTime/1000;
            render.posTex = render.posTex || fbo.tex;
            gl.bindTexture(gl.TEXTURE_2D, render.posTex);

            drawScreenCubes(shd,x,y,z,rx,ry,rz);
            ppFinal.unbind(gl);
            mvPopMatrix();
        });

        //
        // Draw the front faces to the back buffer
        //
        // 4
        Lab.trace("Cubes/Particles", function() {
            mvPushMatrix();
            shd = depthShader;
            shd.bind(gl);
            fbo.bind(gl);
            fbo.clear(gl);
            particleField2.attract.bind(gl);
            particleField2.attract.clear(gl);
            drawFbo(shd, true);
            mvPopMatrix()
        });

        //
        // Finally render the front faces to the screen buffer
        //
        mvPushMatrix();
        // camera    loc      center    up      dest
        mat4.lookAt(cam.loc, cam.center, cam.up, mvMatrix);

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        //mat4.ortho(45, gl.viewportWidth / gl.viewportHeight, 0.1, render.zClip, pMatrix);
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, render.zClip, pMatrix);


        Lab.trace("drawScreenCubes", function() {
            shd = shader;
            shd.bind(gl);
            setMatrixUniforms(shd.prog);
            ppFinal.bind(gl);

            // bind positioning texture
            gl.activeTexture(gl.TEXTURE0);
            render.posTex = render.posTex || fbo.tex;
            gl.bindTexture(gl.TEXTURE_2D, render.posTex);

            drawScreenCubes(shd,x,y,z,rx,ry,rz);
            ppFinal.unbind(gl);
            ppFinal.swap();
        }); 
        mvPopMatrix();

        if (true || render.bloom) {
            //Lab.trace("Bloom", function() {
                bloom.doBlur = render.bloom;
                bloom.render(gl, ppFinal._src, ppFinal._dst);
            //});
        } else {
            Lab.trace("NoBloom", function() {
                copyShader.bind(gl);
                ppFinal.bind(gl, copyShader.prog.tex0);
                gl.bindBuffer(gl.ARRAY_BUFFER, quad);
                gl.vertexAttribPointer(copyShader.prog.vertex, this.quad.itemSize, gl.FLOAT, false, 0,0);
                gl.enableVertexAttribArray(copyShader.prog.vertex);
                gl.drawArrays(gl.TRIANGLES, 0, this.quad.length);
            });
        }
        
        Lab.trace("Sep-Vin-Inv-CombineBloom", function() {
            bltShader.bind(gl);
            ppFinal.swap();
            ppFinal.unbind(gl);

            gl.uniform1i(bltShader.prog.texCount, 2)
            gl.uniform1f(bltShader.prog.cutoff, 0.0)
            gl.uniform1i(bltShader.prog.doVignette, render.vignette ? 1 : 0);

            if (render.colorSep) {
                gl.uniform2f(bltShader.prog.colorSep, render.sep[0], render.sep[1]);
            } else {
                gl.uniform2f(bltShader.prog.colorSep, .0, .0);
            }

            gl.uniform1i(bltShader.prog.tex0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, ppFinal._src);

            gl.uniform1i(bltShader.prog.tex1, 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, ppFinal._dst);

            gl.uniform1f(bltShader.prog.invert, render.invert ? 1 : 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.vertexAttribPointer(bltShader.prog.vertex, this.quad.itemSize, gl.FLOAT, false, 0,0);
            gl.enableVertexAttribArray(bltShader.prog.vertex);
            gl.drawArrays(gl.TRIANGLES, 0, this.quad.length);
            gl.uniform1f(bltShader.prog.invert, 0);
        })

        if (render.schmutz) {
            gl.clear(gl.DEPTH_BUFFER_BIT);
            //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            schShader.bind(gl);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE_MINUS_DEST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
            //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.vertexAttribPointer(schShader.prog.vertex, this.quad.itemSize, gl.FLOAT, false, 0,0);
            gl.enableVertexAttribArray(schShader.prog.vertex);
            gl.drawArrays(gl.TRIANGLES, 0, this.quad.length);
            //throw("poo");
            gl.disable(gl.BLEND);
        }

        if (render.grain) {
            Lab.trace("Grain", function() {
                gl.clear(gl.DEPTH_BUFFER_BIT);
                
                gl.enable(gl.BLEND);
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

                grainShader.bind(gl);
                grainTex.bind(gl, gl.TEXTURE0);
                gl.uniform1i(grainShader.prog.tex0, 0);
                gl.uniform1f(grainShader.prog.time, lastTime);
                gl.bindBuffer(gl.ARRAY_BUFFER, quad);
                gl.vertexAttribPointer(grainShader.prog.vertex, this.quad.itemSize, gl.FLOAT, false, 0,0);
                gl.enableVertexAttribArray(grainShader.prog.vertex);
                gl.drawArrays(gl.TRIANGLES, 0, this.quad.length);

                /*
                */
                gl.disable(gl.BLEND);
            });
        }


        // 2
        mvPopMatrix();
        // 1
        mvPopMatrix();

        // 0
        mvPopMatrix();
    }
 
    
    // world time
    var lastTime = 0;
    var lastTimeDelta = 0;

    var startTime = 0;
    var frame = 0;

    // real time
    var _timeNow = 0;
    var _timeDelta = 0;
    var _fpsLabel;
    var _fpsTotal = 0;
    var _frameCount = 0;
    var _timeLabel;
    var _uiTick = 0;
    var _uiTime = 0;
    var _soundtrack;
    var request = null;
    var resp;

    function GetMenvFrame() {
        if (!request) {
            request = new XMLHttpRequest();
            request.onerror = function() {console.log("boo!")}
            request.onreadystatechange = function() { 
                if (request.readyState != 4) return;
                if (request.status != 200) return;
                resp = eval("(" + request.responseText + ")");
                cam.loc = resp.cam.loc;
                cam.center = resp.cam.center;
                mt = parseFloat(resp.frame) / 24 * 1000;
                _timeDelta = mt - _timeNow;
                _timeNow = mt;
            }
        }
        if (request.readyState != 0 && request.readyState != 4) { 
            return;
        }
        
        request.open('GET', 'http://localhost:8000', true);
        request.send(null);
        //requestAnimFrame(GetMenvFrame());
    }


    function animate() {
        if (MENV_MODE) {
            //GetMenvFrame();
            //_timeNow = _timeNow || 0;
            //_timeDelta = mt - _timeNow;
            //_timeNow = mt;
        } else if (RENDER_MODE) {
            _timeNow += RENDER_SPF;
            _timeDelta = RENDER_SPF;
        } else {
            var t = _timeNow;
            _timeNow = new Date().getTime() - _soundtrack._startTime;
            //_timeNow = _soundtrack.currentTime*1000; //new Date().getTime();
            if (startTime == 0) startTime = _timeNow;
            _timeNow = _timeNow - startTime;
            _timeDelta = _timeNow - t;
        }
        anim.update(_timeNow/1000);
        lastTimeDelta = _timeDelta * render.time.scale;
        lastTime += lastTimeDelta;
        _uiTick++;
        _uiTime += _timeDelta;
        _frameCount++;
        _fpsTotal += _timeDelta/1000;

        if (_uiTick%3 == 0) {
            _fpsLabel = _fpsLabel || document.getElementById("fpsLabel");
            _timeLabel = _timeLabel || document.getElementById("timeLabel");
            _timeLabel.innerHTML = "" + (_timeNow/1000).toFixed(1) + "s &nbsp; "

            //_timeLabel.innerHTML += "Audio: " + _soundtrack.currentTime.toFixed(1) + "s &nbsp; "
            var delta = Math.abs(_timeNow - _soundtrack.currentTime*1000);
            _timeLabel.innerHTML += "Delta: " + delta.toFixed(0) + "ms "
            //if (delta > 250) {
            //    _soundtrack._startTime = new Date().getTime() - _soundtrack.currentTime;
            //}
        }
        if (_uiTick == 9) {
            _fpsLabel.innerHTML = "FPS: " + (1 / (_uiTime/(_uiTick) / 1000)).toFixed(1);
            if (DEBUG_MODE)
                _fpsLabel.innerHTML += " [dbg]"
            else if (RENDER_MODE)
                _fpsLabel.innerHTML += " [render]"
            else
                _fpsLabel.innerHTML += " [opt]"
            _uiTick = 0;
            _uiTime = 0;
        }
    }
 
 
    function tick() {
        if (hadError) {
            console.log("render halted");
            _fpsLabel.innerHTML = "FPS: " + (_frameCount/_fpsTotal).toFixed(2) + Lab.report();
            return;
        }
        hadError = true;

        requestAnimFrame(function() { Lab.accum("tick", tick)}, canvas);
        Lab.accum("DrawScene", function() {
            drawScene();
        });
        Lab.count("Frames", 1);
        Lab.accum("Animate", function() {
            animate();
        });
        if (RENDER_MODE) {
            postImage(canvas, frame);
            frame++;
        }
        hadError = false;
    }
 
    var ty;
    var tx;
    var tz;
    var zoom;
    var pan, dolly;
    var isDown = false;
    var lastx, lasty;
    function wheelEvent(e) {
        ty = ty || document.getElementById("y");
        zoom = zoom || parseInt(ty.value);
        zoom -= e.wheelDelta / 5.0;
        ty.value = zoom;
    }

    function dragEvent(e) {
        tx = tx || document.getElementById("x");
        tz = tz || document.getElementById("z");
        pan = pan || parseInt(tx.value);
        dolly = dolly || parseInt(tz.value);
        if (!isDown) return;
        pan += (e.x - lastx) /8;
        dolly -= (e.y - lasty) / 8;
        lasty = e.y;
        lastx = e.x;
        tx.value = pan;
        tz.value = dolly;
    }
 
    var _audioReady = false;
    var _glReady = false;
    var _enableMouse = false;

    function start() {
        canvas = document.getElementById("canvas");
        if (_enableMouse) {
            canvas.addEventListener("mousewheel", wheelEvent);
            canvas.addEventListener("mousemove", dragEvent);
            document.addEventListener("mousedown", function(e) { isDown=true; lastx = e.x; lasty=e.y; });
            document.addEventListener("mouseup", function(e) { isDown=false; });
            canvas.ondrag = dragEvent;
        }
        initGL(canvas);

        testCanvas();

        initShaders()
        initBuffers();
 
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        
        _glReady = true;

        if (MENV_MODE)
            setInterval(GetMenvFrame, 10);

        enable();
    }

    function enable() {
        if (!_audioReady || !_glReady) {
            elm = document.getElementById("loading");
            elm.innerHTML += ".";
            setTimeout(enable, 500);
            return;
        }
        elm = document.getElementById("loading");
        //elm.innerHTML = "<a class='x' href='#' onclick='play();'>start</a>";
        play()
    }

    function play() {
        elm = document.getElementById("loadingArea");
        elm.style.display = "none";
        _soundtrack = document.getElementById("soundtrack");
        _soundtrack.play();
    }
    

var canvas2d;
var texTitles;
var textData;

function testCanvas() {
    var elem = document.getElementById('textCanvas');
    var size = 150;

    if (elem && elem.getContext) {
      var context = elem.getContext('2d');
      if (context) {
        canvas2d = context;
        context.strokeStyle = '#f00';
        context.font = "bold 32pt helvetica, verdana";
        context.fillStyle   = '#000'; 
        context.fillRect(0, 0, size, size);
        context.fillStyle   = '#fff'; 
        context.fillText("cubic", 20, 60); //30,100, 200);
        context.fillText("dub", 38, 95); //30,100, 200);

        var left = 50;
        var top = 120;

        context.font = "14pt helvetica, verdana";
        context.fillText("by", left-20, top-9); //30,100, 200);
        context.font = "bold 14pt helvetica, verdana";
        context.fillText("jeremy", left+00, top+3); //30,100, 200);
        context.fillText("cowles", left+26, top+20); //30,100, 200);

        /*
        context.beginPath();
        context.moveTo(0,0);
        context.lineTo(10,10);
        context.stroke();
        context.fill();
        context.closePath();
        */

        //
        // XXX: straight up image data was not working (because of float textures, maybe?)
        //      so even if it's not converted to height, it still needs to be float
        //
        texTitles = new Lab.Texture(size, size);
        textData = new Float32Array(4*size*size);
        raw =context.getImageData(0,0,size,size).data;
        for (var i = 0; i < textData.length; i+=4) {
            textData[i] = 0; // x
            textData[i+1] = 0; // y
            textData[i+2] = 0; // w
            
            // z
            textData[i+2] = (raw[i+2]/ 255);
            if (textData[i+2] > 0) 
                textData[i+2] = Math.min(textData[i+2] + .2, 1.2);
            textData[i+2] *= 10;
        }   
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        texTitles.init(gl,textData);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        //texTitles.init(gl,context.getImageData(0,0,size,size).data, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        /*
        texTitles = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texTitles)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, context.getImageData(0,0,size,size).data);
        */
        //gl.generateMipmap(gl.TEXTURE_2D);


      }
    }
}

