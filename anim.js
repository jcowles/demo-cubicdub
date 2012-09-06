
Lab.Shot = Lab.Shot || {};

Lab.Shot = function(duration) {
    this.start = 0;
    this.duration = duration;
    this.progress = 0;

    this.onDraw = function(lastTime, dt) {
        // based on world time
        // to be filled in per-instance
    };
    this.onExit = function() {}
    this.onEnter= function() {}
};

Lab.Anim = Lab.Anim || {};

Lab.Anim = function() {
    this.shots = [];
    this.index = 0;

    this.lastShot = function() {
        return this.shots[this.shots.length-1];
    };

    this.getShot = function() {
        return this.shots[this.index];
    };

    this.update = function(time) {
        // based on real time
        var shot = this.getShot();
        if (time > shot.start + shot.duration) {
            shot.onExit();
            this.index++;
            this.index = Math.min(this.shots.length-1, this.index);
            this.getShot().start = time;
        } else if (time < shot.start) {
            if (this.index == 0) {
                /*
                lastTime = 0;
                lastTimeDelta = 0;
                shot.start = time;
                */
                return;
            }
            shot.onExit();
            this.index--;
            this.getShot().start = time;
        }
        shot = this.getShot();
        shot.progress = (time - shot.start) / shot.duration;
    };

    this.newShot = function(duration) {
        var _shot = new Lab.Shot(duration);
        this.shots.push(_shot);
        return _shot;
    }
};


clamp = function(v, min, max) {
    return Math.max(min, Math.min(max, v));
};

smoothStep = function(edge0, edge1, x) {
    t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
};

smoothStep2 = function(edge0, edge1, t) {
    t = t * t * (3.0 - 2.0 * t);
    return (1 - t)*edge0 + t*edge1;
};

var anim = new Lab.Anim();


function _doSep(lastTime) {
    var PI = 3.1416;
    if (Math.sin(1.25+lastTime/1000*PI*2*(140/60/4)) > 0) {
    //if ((lastTime/1000 % 10) > 1 && (lastTime/1000 % 10) < 3) {
        render.colorSep = true;
        if (render.sep[0] == 0)
            render.sep[0] = 0.01;
        else if (render.sep[0] == 0.01) 
            render.sep[0] = -0.01;
        else
            render.sep[0] = 0.0;
        render.sep[1] = render.sep[0];
    } else {
        render.colorSep = false;
    }
}


// --------------------------------------------------------
//
// Floating Particles
//
anim.newShot(5).onDraw = function(lastTime, dt) {
    render.posTex = particleField.getPosTex();
    render.time.scale = .3;
}
anim.newShot(10).onDraw = function(lastTime, dt) {
    //render.time.scale = smoothStep2(.1, .5, this.progress);
}
anim.newShot(5).onDraw = function(lastTime, dt) {
}
anim.newShot(14.).onDraw = function(lastTime, dt) {
    render.time.scale = smoothStep2(.5, 1, this.progress);
}
anim.lastShot().onExit = function() {
    render.time.scale = 1;
    render.posTex = fbo.tex;
}

//
// Switch to Cubes
//  - strobe + transition
//
anim.newShot(4).onDraw = function(lastTime, dt) {
    this.c = this.c || 0;
    //render.doWave = false;
    //render.bloom = true;
    //render.bloom = this.progress < .5 || Math.random() > 1 - this.progress;
    if (this.progress < .85) {
        if (this.c == 1) {
            this.c = 0;
            if (render.posTex != fbo.tex)
                render.posTex = fbo.tex;
            else
                render.posTex = particleField.getPosTex();
        } else {
            this.c++;
        }
    } else {
        render.posTex = fbo.tex;
    }
}

anim.newShot(3).onDraw = function(lastTime, dt) {
}

//anim.shots = [];
//
// Strobe to dub sound
//
anim.newShot(3).onDraw = function(lastTime, dt) {
    render.bloom = Math.random() > 1 - this.progress;
}


// 
// Zoom in on cube
// 
anim.newShot(2).onDraw = function(lastTime, dt) {
    render.bloom = true; //Math.random() > 1 - this.progress;
    _doSep(lastTime);
    render.posTex = fbo.tex;
    var p = this.progress;

    

    //cam.loc[2] = smoothStep2(0, -70, p);
    cam.center[2] = -120;// + 30*Math.cos(this.progress*2*PI);
};

//
// Pan around
//
anim.newShot(7.0).onDraw = function(lastTime, dt) {
    render.colorSep = false;
    render.bloom = true; //Math.random() > 1 - this.progress;
    render.posTex = fbo.tex;
    var PI = 3.1416;
    var p = this.progress;

    // start = 0
    cam.loc[0] = 30*Math.sin(this.progress*2*PI);

    // start = 10
    //cam.loc[1] = (1-p)*20 + p*0;
    if (p < .5) {
        cam.loc[1] = smoothStep2(0, 50, p*2);
        cam.center[1] = smoothStep2(0, 20, p*2);
    } else {
        cam.loc[1] = smoothStep2(50, 0, 2*(p-.5));
        cam.center[1] = smoothStep2(20, 0, 2*(p-.5));

    }

    // start = -70
    cam.loc[2] = -150*Math.sin(this.progress*(PI));

    if (p > .9)
        render.time.scale = (p - .9) / .1; 
    else
        render.time.scale = .1;
};

anim.lastShot().onExit = function() {
    render.time.scale = 1; //Math.min(5, .1 + this.progress);
};

anim.newShot(.5).onDraw = function(lastTime, dt) {
    var p = this.progress;
    //cam.loc[1] = (1-p)*20 + p*0;
    //cam.center[1] = (1-p)*20 + p*0;
    //cam.loc[2] = (1-p)*-70 + p*0;
    cam.center[2] = -50;// + 30*Math.cos(this.progress*2*PI);
};

anim.newShot(4.5).onDraw = function(lastTime, dt) {
    _doSep(lastTime);
    render.bloom = true; //Math.random() > 1 - this.progress;
    render.posTex = fbo.tex;
    render.time.scale = 1; //Math.min(5, .1 + this.progress);
};

//
// Splash Effect
//
anim.newShot(23.0).onDraw = function(lastTime, dt) {
    this.startTime = this.startTime || lastTime;
    render.bloom = true;
    render.colorSep = false;
    var PI = 3.1416;
    render.doAttract = this.progress < .75
                     && Math.sin(2*this.progress*2*PI) > 0 ? true : false; //!render.doAttract;
    render.doWave = render.doAttract;
    render.posTex = particleField.getPosTex();
    var PI = 3.1416;
    //render.time.scale = .5 + Math.sin(this.progress*2*PI)*.5;
    //render.res = 1.+(.5*Math.sin(lastTime/1000.)+.6)*150.;
};


//
// Cubes spinning & shaking
//
// original was 21
anim.newShot(14).onDraw = function(lastTime, dt) {

    render.doAttract = false;
    render.doWave = true;

    _doSep(lastTime);

    var PI = 3.1416;
    render.res = 1.+(.5*Math.sin(2*this.progress*2*PI)+.6)*150.;

    render.posTex = fbo.tex;
};

/*
anim.newShot(3).onDraw = function(lastTime, dt) {
    render.doWave = false;
    //_doSep(lastTime);
    var PI = 3.1416;
    render.posTex = particleField.getPosTex();
    render.res = 50;
    render.colorSep = false;
    //render.posTex = fbo.tex;
    //render.res = 1.+(.5*Math.sin(lastTime/1000.)+.6)*150.;
};
*/
//anim.shots = [];
anim.newShot(12.5).onDraw = function(lastTime, dt) {
    render.doWave = false;
    var p = this.progress;
    if (p < .5) {
        render.res = 10+1000 * Math.min(1, p*p);
    } else {
        render.res = 10+1000 * Math.min(1, p*p*2);
    }
    _doSep(lastTime);
    this.ct = this.ct || 1;
    if (this.ct == 1) {
        render.doAttract = true;
        this.oldAttract = particleField.attract.tex;
        particleField.attract.tex = texTitles.tex;
        this.ct++;
    }
    cam.loc[0] -= 5*dt/1000;
    cam.loc[1] += 5*dt/1000;
    cam.loc[2] += 5*dt/1000;
    render.updateField = this.progress <= .2; //!render.updateField;
    render.posTex = field._pp._dst; //texTitles.tex;
};

anim.newShot(4.5).onDraw = function(lastTime, dt) {
    particleField.attract.tex = noiseTex.tex; //this.oldAttract.tex;
    render.posTex = particleField.getPosTex();
    render.doAttract = this.progress < .1;
    render.updateField = true;
};
anim.newShot(1).onDraw = function(lastTime, dt) {
    render.zClip = 10000;
    cam.loc[1] += 400*this.progress*this.progress; //dt/1000;
    render.colorSep = false;
    render.doAttract = false;
    particleField.attract.tex = particleField.attract.texObj.tex;
};

anim.newShot(1).onDraw = function(lastTime, dt) {
    // 
    // hard exit, force exception
    // 
    if (!MENV_MODE)
        render.posTex = "DIE";
};


