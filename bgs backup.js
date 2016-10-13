
// Initiate configurables
var armies =[];
var activeArmies = [];
var unitMax = 10;
var unitMin = 5;
var unitHealth = 5;
var expGain = 1;
var minArmies = 2;
var simRunning = false;


// Draws and sorts active/inactive armies in the armies ui panel
function drawArmies(){
	// first remove all items from panel
	$("#armyList").empty();
	// draw each inserting it to where it belongs
	armies.forEach(function(army){
		if (army.isActive){
			$("#armyList").prepend(`<li class="activeArmy">${army.name}: ${army.health}</li>`);
		}
		else {
			$("#armyList").append(`<li class="inactiveArmy">${army.name}: ${army.health}</li>`);
		}
		
	})
}

// Basic anti injection check
function cleanInput(str){
	return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Keep start battle button disabled until no. of armies is less then min
// also disable it for the duration of the sim
function toggleStartButton(){
	if (armies.length < minArmies || simRunning){
		$("#beginBattle").hide();
	}
	else {
		$("#beginBattle").show();
	}
}

toggleStartButton();

// When user clicks on add army, makes army acording to params
function makeArmy(){
	// if army is succesfully added, make color green
	$("#inputFeedback").css("color", "green");

	// This is the data from users input
	var data = [
				// Strings
				$("#armyName").val(),
				$("#strategy").val(),
				// Numbers
				$("#squadCount").val(), 
				$("#soldierCount").val(), 
				$("#vehicleCount").val(),
				$("#operators").val()
			   ];

	// Clean up data
	for (let i = 0; i < data.length; i++){
		data[i] = cleanInput(data[i]);
	};

	// get total number of units
	var totalUnits = parseInt(data[3]) + parseInt(data[4]);
	if ( totalUnits > unitMax || totalUnits < unitMin){
		$("#inputFeedback").css("color", "red");
		console.log("Error: unit number higher or lover then limit", totalUnits);
		return;
	}

	// Create army based on config
	var config = new ArmyConfig(data);
	armies.push(new Army(config));

	// Update stuff
	updateArmies();
	drawArmies();
	toggleStartButton();

}
// Config constructor
function ArmyConfig(args){
	this.armyName = args[0];
	this.armyStrategy = args[1];
	this.squadCount = args[2];
	this.soldierCount = args[3];
	this.vehicleCount = args[4];
	this.operatorsCount =args[5]; 
}

// Prepare battle related globals
var aggressorArmyIndex;
var aggressorArmy;
var strategy;
var defendingArmyIndex;
var defendingArmy;
function updateArmies(){
		// first update all armies active status
		armies.forEach(function(army){
			army.updateActives();
			army.updateHealth();
		});
		// populate list of active armies
		activeArmies = armies.filter(function(item){
			return item.isActive;
		});
	}

function beginBattle(){

	if (activeArmies.length < 2){
		if (activeArmies.length == 1){
			output(`<span class="victory">${activeArmies[0].name} is the only man standing and the final victor!!!`);
			simRunning = false;
			return;
		}

	}

	simRunning = true;
	toggleStartButton();


	// Randomly choose first aggressor army from list of active armies
		aggressorArmyIndex = random(0, activeArmies.length -1);
		aggressorArmy = activeArmies[aggressorArmyIndex];
		strategy = aggressorArmy.attackStrategy;
		// Temporarily remove aggresor from army list
		// and prevent it from being chosen as its own oponent
		activeArmies.remove(aggressorArmyIndex);

		
		// Choose defending army ( random logic for now )
		defendingArmyIndex = random(0, activeArmies.length -1);
		defendingArmy = activeArmies[defendingArmyIndex];

		// Push aggressor army back into available armies array
		activeArmies.push(aggressorArmy);

	// Main battle logic goes in here!
	var rounds = 0;
	var firstFight = true;
	output("<span class='battleStarts'>Battle Starts!</span>");	
	function fight(){
		if (!firstFight){
			[aggressorArmy, defendingArmy] = [defendingArmy, aggressorArmy];
		}
		else {
			firstFight = false;
			output(`<span class="firstAttack">${aggressorArmy.name} attacks ${defendingArmy.name}</span>`);
		}
		for (let i = 0; i < aggressorArmy.activeSquads.length; i++){
			if (!defendingArmy.isActive){
				output(`<h2 class="victory"> ${aggressorArmy.name} has won!<h2>`);
				clearInterval(startFight);
				updateArmies();
				drawArmies();
				return beginBattle();
			}
			var attackSquad = aggressorArmy.activeSquads[i];
			var defendSquad;

			if (attackSquad.isRecharging()){
				continue;
			}

			if (strategy == "random"){
				defendSquad = defendingArmy.getRandomSquad();				
			}
			else if (strategy == "weakest"){
				defendSquad = defendingArmy.getWeakestSquad();
			}
			else if (strategy == "strongest"){
				defendSquad = defendingArmy.getStrongestSquad();
			}
			if (attackSquad.attackSuccessChance() >= defendSquad.attackSuccessChance()){
				var damage = attackSquad.inflictsDamage();
				defendSquad.receiveDamage(damage);
				attackSquad.expGain();
				attackSquad.triggerCooldown();
				defendingArmy.updateHealth();
				output(`<span class="attack">${aggressorArmy.name} attacks ${defendingArmy.name}</span>`);		
				output(`<span>${aggressorArmy.name} squad ${i + 1}'s attack has succeeded with ${round(damage)} damage inflicted!<span>`);
				output(`<span>${defendingArmy.name} has ${round(defendingArmy.health)} remaining health</span>`);
			}
			else {
				output(`<span class="attack">${aggressorArmy.name} attacks ${defendingArmy.name}</span>`);		
				output (`<span class="defense">${defendingArmy.name} squad has succesfully defended itself</span>`);
			}

		updateArmies();
		drawArmies();
		}
	}
	var startFight = setInterval(fight, 20);
}

// Unit constructor

function Unit(){
	var unit = this;
	// Set properties common for all units
	unit.type = "unit";
	unit.health = unitHealth || 100;
	unit.rechargeRate = 100;
	unit.isActive = true;
	unit.isRecharging = false;
	unit.triggerCooldown = function(){
		unit.isRecharging = true;
		setTimeout(function(){
			unit.isRecharging = false;
		}, unit.rechargeRate);

		return (unit.type + " has finished recharging!");
	}
}

// Soldier type unit constructor

function Soldier(){
	// Inherits properties from Unit
	var soldier = this;
	Unit.apply(soldier);
	

	soldier.type = "soldier";

	// init config variables
	var attackSuccessCoef = 0.5;
	var inflictsDamageBase = 0.05;
	var expCap = 50;

	soldier.rechargeRate = random(10000, 12000);

	soldier.experience = 0;

	/* Soldier methods */ 

	// Calculate and return chance that attack will succeed
	soldier.attackSuccessChance = function(){
		return round(attackSuccessCoef * (1 + soldier.health/100) * random(50 + soldier.experience, 100)/100);
	}

	// Calculate and return damage he makes in case of succesfull attack
	soldier.inflictsDamage = function(){
		if (soldier.isRecharging){
			return 0;
		}
		return round(inflictsDamageBase + soldier.experience / 100);
	} 

	// Increase soldiers exp
	soldier.expGain = function(arg){	


		var arg = arg || expGain;
		soldier.experience += arg;

		// Catch and reset experience if it skyrockets above limit
		if (soldier.experience > expCap){
			soldier.experience = expCap;
		}

		return soldier.experience;
	}

	// Decrease units health, and deactivate it if its health gets below 0. Croak it if neccesary.
	soldier.receiveDamage = function(damageTaken){
		// Decrease units health 
		soldier.health -= damageTaken;

		//deactivate unit if its health drops to 0

		if (soldier.health <= 0){
			soldier.health = 0;
			soldier.isActive = false;
		}
		return soldier.health;
	}

}

// Vehicle type unit constructor

function Vehicle(operators){
	// Inherits from unit
	var vehicle = this;
	Unit.apply(vehicle);
	

	vehicle.type = "vehicle";

	//Set vehicles recharge rate
	vehicle.rechargeRate = random(1001, 1100);

	//set the default number of operators to 3

	var operators = operators || 3;

	// Populate and set vehicle operators
	operators = makeObjectArray(Soldier, operators);
	vehicle.operators = operators;


	// Create dynamic atributes / methods
	var soldiers = vehicle.operators;
	vehicle.attackSuccessChance = function(){
		var rates = [];

		soldiers.forEach(function(member){
			if (member.isActive){
				rates.push(member.attackSuccessChance());
			}
		}) 
			
		return round(0.5 * (1 + vehicle.health / 100) * gavg(rates));
	}

	vehicle.experience = function(){
		var experience = getProps(soldiers, "experience");

		return sum(experience);
	
	}

	// Set vehicles health
	var totalHealth = getProps(soldiers, "health");

	vehicle.health += avg(totalHealth);


	// Calculate damage vehicle inflicts
	vehicle.inflictsDamage = function(){
		if (vehicle.isRecharging){
			return 0;
		}
		return round(0.1 + vehicle.experience() / 100) ;
	}

	// Calculate the way vehicle receives damage
	vehicle.receiveDamage = function(damageTaken){
		var worstBeating = random(0, soldiers.length -1);
		vehicle.health -= round(damageTaken * (6/10));
		for (let i = 0; i < soldiers.length; i++){
			if (i == worstBeating){
				soldiers[i].receiveDamage(round(damageTaken * (2/10)));
			}
			else {
				soldiers[i].receiveDamage(round(damageTaken * (1/10)));
			}
		}

		var activeSoldiers = getProps(soldiers, "isActive");
		if (activeSoldiers.indexOf(true) == -1){
			vehicle.isActive = false;
		}
		if (vehicle.health <= 0){
			vehicle.health = 0;
			vehicle.isActive = false;
		}
		return vehicle.health;
	}
	// Distribute exp to all of members
	vehicle.expGain = function(expGain){
		var expGain = expGain || 1;
		soldiers.forEach(function(soldier){
			if (soldier.isActive){
				soldier.expGain(expGain);
			}
		});
		return 1;
	}
}


// Squad constructor
function Squad(config){
	var squad = this;
	squad.type = "squad";
	squad.soldiers = config.soldierCount || 8;
	squad.vehicles = config.vehicleCount || 2;

	squad.isActive = true;
	squad.isRecharging = function(){
		var status = getProps(squad.members, "isRecharging");
		if (status.indexOf(false) == -1){
			return true;
		}
		return false;

	};


	// Populate squad
	var soldiers = makeObjectArray(Soldier, squad.soldiers);


	var vehicles = [];

	
	for (let i = 0; i < config.vehicleCount; i++){
		vehicles.push(new Vehicle(config.operatorsCount));
	};

	var members = [].concat(soldiers).concat(vehicles);
	squad.members = members;


	squad.health = sum(getProps(members, "health"));


	// calculate attack success chance
	squad.attackSuccessChance = function(){
		var allChances = []
		squad.members.forEach(function(member){ 
			if (member.isActive){
				allChances.push(member.attackSuccessChance())
			}
		});
		return round(gavg(allChances));
	}

	// Receive damage logic
	squad.receiveDamage = function(damageTaken){
		// Split damage among all squad members

		damageTaken = round(damageTaken/squad.members.length);

		// deal them damage
		squad.members.forEach(function(member){
			if (member.isActive){
				member.receiveDamage(damageTaken);
			}
		});
		// deactivate squad if all members are inactive
		if (getProps(squad.members,"isActive").indexOf(true) == -1){
			squad.isActive = false;
		}


		squad.health = sum(getProps(members, "health"));
		return 1;
	}

	squad.inflictsDamage = function(){

		var arr = [];
		squad.members.forEach(function(member){
			if (member.isActive){
				arr.push(member.inflictsDamage());
			}
		});

		arr = arr.length !== 0 ? arr : [0]; 
		return sum(arr);

	}

	squad.triggerCooldown = function(){
		squad.members.forEach(function(member){
			member.triggerCooldown();
		});
	}


	squad.expGain = function(expGain){
		var expGain = expGain || 1;
		squad.members.forEach(function(member){
			member.expGain(expGain);
		});
	}
}

function Army(config){
	var army = this;
	army.name = config.armyName;
	army.attackStrategy = config.armyStrategy;
	army.isActive = true;
	army.squads = [];
	army.activeSquads = [];

	for (let i = 0; i < config.squadCount; i++){
		army.squads.push(new Squad(config));
	}

	army.health = sum(getProps(army.squads, "health"));

	army.updateHealth = function(){
		army.health = round(sum(getProps(army.squads, "health")));
		army.updateActives();
	}

	army.updateActives = function(){
		var actives = getProps(army.squads, "isActive");
		if (actives.indexOf(true) == -1){
			army.isActive = false;
		}
		army.activeSquads = [];
		army.squads.forEach(function(squad){
			if (squad.isActive){
				army.activeSquads.push(squad);
			}
		});
	}
	army.getStrongestSquad = function(){
		army.updateActives();
		if (army.activeSquads.length == 0){
			return false;
		}
		return getStrongest(army.activeSquads, "health");
	};
	army.getWeakestSquad = function(){
		army.updateActives();
		if (army.activeSquads.length == 0){
			return false;
		}
		return getWeakest(army.activeSquads, "health");
	}
	army.getRandomSquad = function(){
		army.updateActives();
		if (army.activeSquads.length == 0){
			return false;
		}
		return getRandom(army.activeSquads);
	}

}

function getStrongest(items, criteria){
	var factors = getProps(items, criteria);
	var strongest = items[factors.indexOf(Math.max(...factors))];
	return strongest;
}
function getWeakest(items, criteria){
	var factors = getProps(items, criteria);
	var weakest = items[factors.indexOf(Math.min(...factors))];
	return weakest;
}
function getRandom(items){
	return items[random(0, items.length -1)];
}


/* Helper functions */


// Array Remove - By John Resig (MIT Licensed)
// copypasta
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

// returns sum of the array
function sum(arr){
	var total = 0;
	arr.forEach(function(item){
		total += item;
	})
	return total;
}

function getProps(list, prop){

	// First argument must be an object array
	// Second argument must be a string representing either property,
	// or function that returns desire value on each object.


	var result = [];

	for (let i = 0; i < list.length; i++){
		result.push(list[i][prop]);
	}
	return result;
}



// Reads dynamic properties from object by calling functions that return them

function getDynamicProps(list, prop, excludeInactive){

	// Not actually working unless objects are instantiated
	// Cannot be used within constructor function itself which kind of defeats the purppose.

	// First two arguments must be strings, first one stringified version of arrays name/location,
	// second one string version of method we want to execute
	// Third, optional argument is boolean to include or exclude inactive units
	// Default is excluded

	var excludeInactive = excludeInactive || true;
	var result = [];

	if (excludeInactive){
		for (let i = 0; i < eval(list).length; i++){
			if(eval(`${list}[${i}].isActive`)){
				result.push( eval(`${list}[${i}].${prop}`));
			}
		}
	}

	else {
		
		for (let i = 0; i < eval(list).length; i++){
			result.push( eval(`${list}[${i}].${prop}`));
		}
	}

	result = result.length == 0 ? [0] : result;
	return result;
}

function gavg(arr){
	return Math.pow(arr.reduce(function(a, b){return a * b}), 1/arr.length);
}

// Get average of list of properties 
function avg(arr){
	return arr.reduce(function(a, b){return a + b})/arr.length;
}

// Generates random number within specified range, inclusive
function random(min, max){
  	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Rounds num to default 2 or specified num of decimal places
function round(num, places){
	
	var places = places || 2;
	places = Math.pow(10, places);
	return Math.round(num * places)/places;
}

// Creates and returns Array of length n populated with specified items/unique objects
function makeObjectArray(item, length){
	var arr = [];

		for (let i = 0; i < length; i++){
			arr[i] = new item();
		}
	return arr;
}

// Generic output function
function output(arg){
	$("#output").append("<p>" + arg + "<p>");
}







































