var config = require('config');
var kle = require('./API/KalturaLiveEntries.js').KalturaLiveEntries;
var q = require('q');
var _ = require('underscore');
var EntryTest=require('./EntryTest.js');
var LoggerEx = require('./utils').LoggerEx;
var repeatPromise = require('./utils').repeatPromise;
var WowzaTestInfo = require('./TestInfo.js').WowzaTestInfo;
var KalturaTestInfo = require('./TestInfo.js').KalturaTestInfo;
var logger = LoggerEx("MainTest","");
var testResults = LoggerEx("testResults","");
var FFmpegProcesses = [];

var streamEntry=function(testInfo,minDelay,maxDelay,duration,index) {

    var testObj=null;
    if (testInfo.entryId) {
        testObj=new KalturaTestInfo(testInfo);
    } else {
        testObj=new WowzaTestInfo(testInfo);
    }
    var id= testObj.id;

    var delay = minDelay + Math.random()*(maxDelay-minDelay);

    logger.info("Going to start ",id," in ",delay,' seconds');
    return q.delay(delay*1000).then(function() {
        var entryTestInstance = new EntryTest(testObj);

        logger.info("Starting",id);
        return entryTestInstance.start().then(function (task) {
            logger.info("Entry", id, "started successfully with PID: "+task.getStatus().pid+", continue to test for ", duration, " seconds");
            if (FFmpegProcesses[index]!==undefined){
                var task=FFmpegProcesses[index];
                logger.warn("ffmeg with PID "+task.getStatus().pid+ " still running. Stop it")
                task.stop();
            }
            FFmpegProcesses[index]=task;
            return entryTestInstance.processing()
        }).then(function(){
            return repeatPromise(logger,function() {
                return entryTestInstance.verifyAlive();
            },60*1000,Math.round(duration/60));
        }).then(function () {
            logger.info("Entry",id,"stopping");
            return entryTestInstance.stop();
        }).then(function () {
            logger.info("Test of entry %s was success! %j",id,entryTestInstance.getResults());
            testResults.warn("Test of entry %s was success! %j",id,entryTestInstance.getResults());

            return q.resolve(true);
        }).catch(function (err) {
            //test failed
            logger.info("Test of entry ",id," failed!",err);
            testResults.warn("Test of entry ",id," failed!",err);

            logger.info("Entry",id,"stopping");
            return entryTestInstance.stop().then (function() {

                return q.resolve(false);
            });
        });
    }).finally(function(result) {
        if (FFmpegProcesses[index]){
            FFmpegProcesses[index].stop();
            FFmpegProcesses[index]= undefined;
        }
        return streamEntry(testInfo,minDelay,maxDelay,duration);
    });
};

var entries=config.entires;



var fixedEntries=entries.slice(0,config.test.fixedEntries.count);
fixedEntries.forEach(function(entryId,index){
    streamEntry(entryId, config.test.fixedEntries.minDelay,config.test.fixedEntries.maxDelay, config.test.fixedEntries.duration,index);
});




(function wait () {
    setTimeout(wait, 1000);
})();
process.on('SIGTERM', function () {
FFmpegProcesses.forEach(function(task){
    logger.warn("Stopping FFmpeg for %j",task.getStatus())
    task.stop();
});


});