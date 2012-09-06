
Lab.Automation = Lab.Automation || {};

Lab.Note = function(start, end, value) {
    this.start = start;
    this.end = end;
    this.value = value;
};


Lab.Signal = function(name, length) {
    this.name = name;
    this.length = length;
    this.isDone = false;
    this.isActive = false;
    this.startBeats = startBeats;
    this.activeBeats = activeBeats;

    this.head = 0;
    this.pat = 0;

    this.update = function(beat, time, dt) {
        if (this.isDone) return;

        // advance the head offset
        var curBeat = this.startBeats[this.head];
        if (beat > curBeat + this.length) {
            this.head++;
            this.isDone = head >= this.startBeats.length;
            if (this.isDone) {
                this.isActive = false;
                return;
            }

            // start the pattern over at this new offset
            this.pat = 0;
        }

        if (this.pat > this.activeBeats.length)
            return;

        var note = this.activeBeats[this.pat];
        // advance the note offset
        if (beat >= note.end) {
            this.pat++;
            if (this.pat > this.activeBeats.length) {
                this.isActive = false;
                return;
            }
        }
        
        if (beat < note.start) {
            this.isActive = false;
            return;
        }

        if (beat >= note.start && beat < note.end) {
            this.isActive = true;
            return;
        }
       
    };

    this.isActive = function(beat) {
        for (var i = 0; i < this.startBeats; i++) {
            var start = this.startBeats[i];
            if (beat < start || beat > start+this.length)
                continue;

            // the requested beat is in the active range
            // check to see if the beat is in the active beat set
            var beatInPattern = beat - start;
            if (beatInPattern in this.activeBeats)
                return true;
        }

        return false;
    };
};

Lab.Automation = function(bpm) {
    this.bpm = bpm;
    this.time = 0;
    this.signals = {};

    this.update = function(time, dt) {
        this.time = time;
        var beat = this.getBeat();
        for (id in this.signals) {
            this.signals[id].update(beat, time, dt);
        }
    };

    this.getBeat = function() {
        var minutes = this.time/1000/60;
        return minutes * this.bpm;
    }

    this.addSignal = function(sig) {
        this.signals[sig.name] = sig;
    };


    this.isActive = function(sigName) {
        if (!sigName in this.signals)
            throw "Signal not found";

        var signal = this.signals[sigName];
        var beat = this.getBeat();
    };
};


Lab.testAutomation = function() {
    //          0  1  2  3  4  5  6  7
    // bass     xx    xx    xx    xx 
    var bass = new Lab.Signal("bass", 8);
    bass.startBeats = [ 0, 12 ];
    bass.activeBeats = [ new Lab.Note(0,1,1),
                         new Lab.Note(0,1,1),
                         new Lab.Note(0,1,1),
                         new Lab.Note(0,1,1)  ];
};



