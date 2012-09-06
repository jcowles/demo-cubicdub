
Lab.Trace = Lab.Trace || {};

Lab.enableTrace = false;

Lab.traceData = {};
Lab.accumData = {};
Lab.countData = {};

Lab.timeFunc = function(func) {
    var start = (new Date).getTime();
    func();
    return ((new Date).getTime() - start);
}

Lab.count = function(id, value) {
    if (!Lab.enableTrace) return;
    if (!(id in Lab.countData)) {
        Lab.countData[id] = value;
    }
    Lab.countData[id] += value;
}

Lab.accum = function(id, func) {
    if (!Lab.enableTrace) { func(); return; }

    var time = Lab.timeFunc(func);

    if (!(id in Lab.accumData)) {
        Lab.accumData[id] = [];
    } 

    Lab.accumData[id].push(time);
};

Lab.trace = function(id, func) {
    if (!Lab.enableTrace) { func(); return; }
    var time = Lab.timeFunc(func);

    if (!(id in Lab.traceData)) {
        Lab.traceData[id] = [];
    } 
    Lab.traceData[id].push(time);
};

Lab.report = function() {
    if (!Lab.enableTrace) return "";
    var s = "";
    var totals = {};
    var grandTotal = 0;

    console.log("ACCUM/COUNTERS:");
    s = "<br>";
    for (id in Lab.accumData) {
        total = 0;
        for (var i = 0; i < Lab.accumData[id].length; i++) {
            total += Lab.accumData[id][i];
        }
        s += id + ": " + total.toFixed(2) + "<br>";
        console.log(id + ": " + total.toFixed(2));
    }

    for (id in Lab.countData) {
        s += id + ": " + Lab.countData[id].toFixed(2) + "<br>";
        console.log(id + ": " + Lab.countData[id].toFixed(2));
    }

    for (id in Lab.traceData) {
        var times = Lab.traceData[id];
        var sum = 0;
        for (var i = 0; i < times.length; i++) {
            sum += times[i];
        }
        totals[id] = sum;///times.length;
        grandTotal += totals[id];
    }
    
    console.log("TRACE:");
    for (id in totals) {
        time = totals[id];
        pct = (time/grandTotal*100);
        if (pct > 1) {
            s +=  pct.toFixed(1) + "% --"
                           + id + ": " + time.toFixed(2) 
                           + " count: " + Lab.traceData[id].length + "<br>";

            console.log( pct.toFixed(1) + "% --"
                           + id + ": " + time.toFixed(2) 
                           + " count: " + Lab.traceData[id].length
                           ); 
        }
    }

    return s;
};


