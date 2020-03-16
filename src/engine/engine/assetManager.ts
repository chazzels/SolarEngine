/*
*	responsible for loading and managing assets loaded into the engine.
*	direct access to functions from asset_playhead asset_store required.
*	asset sha1 keys are generated by this module.
*	TODO: validate assets before loading.
*/

import { sha1 } from "./interface/sha1";
import { assetState } from "./interface/assetState";
import { assetData } from "./interface/assetData";
import { fixtureTarget } from "./interface/fixtureTarget";

import { AssetStore } from "./ext/assetStore";
import { AssetPlayhead } from "./ext/assetPlayhead";
import { AssetRank } from "./ext/assetRank";

import { Asset } from "./assetObj";

import { Logger } from "../../shared/logger";

import * as Crypto from "crypto";

class AssetManager {
	
	static log:any;
	
	activeManifest: any = [];
	
	/* module variables */
	private _store: any;
	private _playhead: any;
	private _rank:any;
	private _assetNames: any = new Map();
	private _assetKeys: any = [];
	private _assetCount: number = 0;
	
	constructor(options: any, perf: any) {
		
		AssetManager.log = new Logger("ASSET_MGMT");
		AssetManager.log.c("STARTING");
		
		this._store = new AssetStore(options.store, perf);
		
		this._playhead = new AssetPlayhead(options.playhead, perf);
		
		this._rank = new AssetRank(options.rank, perf);
		
	}
	
	/*----------------------------------------------\
	|	manager module functionality
	\----------------------------------------------*/
	
	/* update playhead states and update active asset manifest. */
	generateManifest() {
		
		this.activeManifest = this._playhead.update();
		
		return this.activeManifest;
		
	}
	
	/* generate a key and load the asset data into modules. */
	/* advance internal asset count by one. store data in modules. */
	/* return the new sha1 key */
	/* @param {any} assetDate - json object containing valid asset data structure. */
	loadAsset(assetData: any, shaOverride?:any) {
		
		
		// DEV 
		let asset = new Asset(assetData, shaOverride);
		if(shaOverride == "DEVELOPMENTDATADUMP") {
			asset.exportData();
		}
		// DEV
		
		
		let shakey:sha1;
		
		// generate unique sha1 key to reference data fragments.
		shakey = this.generateAssetSHA1(assetData);
		
		if(typeof shaOverride !== "undefined") {
			AssetManager.log.c("SHA_OVERRIDE", shaOverride);
			shakey = {
				hex: shaOverride,
				short: shaOverride.substring(0,10)
			}
		}
		
		// advance the count of assets loaded.
		this._assetCount++;	
		
		// pair the sha1 key to the assets name in a map.
		this._assetNames.set(shakey, assetData.name);
		
		// add the sha1 key the arry of sha1 keys
		this._assetKeys.push(shakey);
		
		// load the asset data with the sha1 key to the assetStore module.
		this._store.loadTrack(shakey, assetData);
		
		// load the asset data with the sha1 key to the assetPlayhead module.
		this._playhead.loadTimeline(shakey, assetData);
		
		// DEV: do a sample query based on the load asset targets.
		this.queryTarget(assetData.meta.trackTarget);
		
		// return the sha1 key object as a refence to the asset.
		return shakey;
		
	}
	
	/* remove asset from the manager. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	dumpAsset(shakey: sha1) {
		
		this._store.dumpTrack(shakey);
		
		this._playhead.dumpTimeline(shakey);
		
		let keyIndex = this._assetKeys.indexOf(shakey);
		
		if(keyIndex !== -1) {
			
			this._assetKeys.splice(keyIndex, 1);
			
		}
		
	}
	
	/* returns all the current data on an asset. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	getState(shakey: sha1): assetState {
		
		let assetObj: assetState = {
			cue: {},
			previousCue: {}, 
			playhead: {},
			progress: 0
		};
		
		let cue = this.getCue(shakey),
			previousCue = this.getPreviousCue(shakey),
			playhead = this.getPlayhead(shakey),
			progress = this.getProgress(shakey);
		
		if(typeof cue !== null) {
		
			assetObj.cue = cue;
			
			assetObj.previousCue = previousCue;
			
			assetObj.playhead = playhead;
			
			assetObj.progress = progress;
			
			return assetObj;
			
		} else {
			
			return null;
			
		}
		
	}
	
	/* returns a list of active asset keys in a array. */
	getManifest() {
		
		return this.activeManifest;
		
	}
	
	/*----------------------------------------------\
	|	_store module functionality
	\----------------------------------------------*/
	
	/* return cue data from a loaded asset. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	getCue(shakey: sha1) {
		
		let currentIndex = this._playhead.getIndex(shakey);
		
		if(typeof currentIndex !== null) {
		
			return this._store.getCue(shakey, currentIndex);
		
		} else {
			
			return null;
			
		}
		
	}
	
	/* return the previous cue data from a loaded asset. */
	/* will return a zerod out cue if one is not avaible. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	getPreviousCue(shakey: sha1) {
		
		let playhead = this._playhead.getPlayhead(shakey);
		
		let currentIndex = playhead.index;
		
		if(currentIndex <= playhead.indexMax && currentIndex > 0) {
			
			return this._store.getCue(shakey, currentIndex-1);
			
		} else  {
			
			return {
				red: 0,
				green: 0,
				blue: 0
			}
			
		}
		
	}
	
	/* parse a target query string into a target object.  */
	/* @param {string} qryStr - a string containing targetting  */
	queryTarget(qryStr: string): fixtureTarget {
		
		return this._rank.queryTarget(qryStr);
		
	}
	
	/*----------------------------------------------\
	|	_playhead module functionality
	\----------------------------------------------*/
	
	/* return _playhead data from a loaded asset. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	getPlayhead(shakey: sha1) {
		
		return this._playhead.getPlayhead(shakey);
		
	}
	
	/* return progress [0-100.00] from a loaded asset. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	getProgress(shakey: sha1) {
		
		return this._playhead.getProgress(shakey);
		
	}
	
	/* change asset playhead state to start playing. */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	play(shakey: sha1,) {
		
		this._playhead.play(shakey);
		
	}
	
	/* change asset playehad state to stop playing */
	/* @param {string} shakey - sha1 key used to reference an asset. */
	pause(shakey: sha1) {
		
		this._playhead.pause(shakey);
		
	}
	
	/*----------------------------------------------\
	|	internal module functions
	\----------------------------------------------*/
	
	/* generates a SHA1 hex string based on asset parameters */
	private generateAssetSHA1(assetData: any) : sha1 {
		
		let shaSum = Crypto.createHash('sha1');
		
		let shaIn = assetData.name.toString() 
			+ '==' + assetData.timeline.length.toString()
			+ 'x' + assetData.track.length.toString()
			+ ':' + assetData.meta.toString()
			+ '@' + this._assetCount.toString();
		
		/* generate sha1 from input string */
		shaSum.update(shaIn);
		
		/* save a hex value of the sha1 */
		let shaReturn = shaSum.digest('hex');
		
		return {
			hex: shaReturn,
			short: shaReturn.toString().substring(0,10)
		};
		
	}
	
}

export { AssetManager };