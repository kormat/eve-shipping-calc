var myApp = angular.module('kneesCalc',[]);

var routes = ["catch"];

var params = ["route", "pickup", "dest", "vol", "val", "cntr", "credit"];
var param_map = {
  "route": "form_route",
  "pickup": "form_pickup",
  "dest": "form_dest",
  "vol": "form_vol",
  "val": "form_val",
  "cntr": "form_container",
  "credit": "creditDiscount",
};
var tradeHubs = ["Amarr"];

function CalcController($scope, $location) {
  $scope.status = "Initial";
  $scope.totalCost = undefined;
  if(routes.length == 1)
    $scope.form_route = routes[0];
  else
    $scope.form_route = "";
  $scope.form_pickup = "";
  $scope.form_dest = "";
  $scope.form_vol = 50;
  $scope.form_val = 100;
  $scope.form_container = false;
  $scope.creditDiscount = 0;
  $scope.oldSavedState = {};
  $scope.permaLink = undefined;
  $scope.desc = "";
  $scope.inEve = typeof CCPEVE === "object";
  $scope.pickupStations = null;
  $scope.destStations = null;
  $scope.maxVolume = 320;
  $scope.maxValue = 1000;

  if($scope.inEve) {
    $scope.status = "requesting trust";
    CCPEVE.requestTrust("http://diamond.ichbinn.net/knees-calc/*");
  };

  $scope.showStn = function(id) {
    CCPEVE.showInfo(3867, id);
  };

  $scope.showCorp = function() {
    CCPEVE.showInfo(2, 98237970)
  };

  $scope.createContract = function() {
    CCPEVE.createContract(3, $scope.form_pickup.id);
  };

  $scope.routeType = function(pickup, dest) {
    if(pickup == "" || dest == "")
      return "incomplete";
    if(pickup.sec == "high" && dest.sec == "high")
      return "high";
    if(pickup.sec == "null" && dest.sec == "null")
      return "null";
    return "highnull";
  }

  $scope.updateCosts = function() {
    $scope.status = "updateCosts()";
    $scope.calcHighsecCost($scope.form_route, $scope.form_pickup, $scope.form_dest);
    $scope.calcNullsecCost($scope.form_route, $scope.form_pickup, $scope.form_dest);
    $scope.calcContainerCost();
    $scope.calcTotalCost($scope.form_pickup, $scope.form_dest);
    $scope.calcDescription();
  }

  $scope.calcHighsecCost = function(route, pickup, dest) {
    $scope.status = "calcHighsecCost()";
    if($scope.routeType(pickup, dest) != "incomplete") {
      if((tradeHubs.indexOf(pickup.name) > -1) ||
          (tradeHubs.indexOf(dest.name) > -1)) {
        $scope.highsecCost = Math.ceil($scope.form_val / 100);
        $scope.highsecRate = "1M per 100M ISK";
        return;
      }
    }
    $scope.highsecCost = 0;
    $scope.highsecRate = "";
  };

  $scope.calcNullsecCost = function(route, pickup, dest) {
    $scope.status = "calcNullsecCost()";
    switch($scope.routeType(pickup, dest)) {
      case "incomplete":
      case "high":
        $scope.nullsecCost = 0;
        $scope.nullsecRate = "";
        return;
    }

    if(route == "catch") {
      $scope.status = "calcNullsecCost() catch";
      if(pickup.sec == "high") {
        $scope.status = "calcNullsecCost() inbound to 4-07";
        $scope.nullsecCost = Math.ceil($scope.form_vol / 10) * 1.85;
        $scope.nullsecRate = "1.85M per 10k m^3";
      } else if (dest.sec == "high") {
        $scope.status = "calcNullsecCost() outbound from 4-07";
        $scope.nullsecCost = Math.ceil($scope.form_vol / 10) * 0.9;
        $scope.nullsecRate = "0.9M per 10k m^3";
      } else {
        $scope.nullsecCost = 1;
        $scope.nullsecRate = [
          "Error: unknown source/dest pair: ",
          $scope.form_pickup.name,
          $scope.form_dest.name].join(",");
      }
    }
  };

  $scope.calcContainerCost = function() {
    $scope.status = "calcContainerCost()";
    if($scope.form_container == true)
      $scope.containerCost = 5;
    else
      $scope.containerCost = 0;
  };

  $scope.calcTotalCost = function(pickup, dest) {
    $scope.status = "calcTotalCost()"
    if($scope.routeType(pickup, dest) != "incomplete")
      $scope.totalCost = $scope.highsecCost + $scope.nullsecCost + $scope.containerCost - $scope.creditDiscount;
    else
      $scope.totalCost = "";
  };

  $scope.calcDescription = function() {
    $scope.status = "calcDescription()";
    var desc = []
    if($scope.form_val)
      desc.push($scope.form_val+"M value");
    if($scope.creditDiscount)
      desc.push($scope.creditDiscount+"M credit");
    if($scope.form_container)
      desc.push("container");
    $scope.desc = desc.join(", ");
  };

  $scope.restoreState = function(event) {
    var savedState = $location.search();
    if(savedState == $scope.oldSavedState)
      //No changes, skip it.
      return;
    for(var i=0; i < params.length; i++) {
      var param = params[i];
      if(typeof savedState[param] !== "undefined")
        $scope.calcUpdate(param, savedState[param]);
    };
    //Now that updates are done, regen url params, save new copy
    $scope.saveState();
  };
  $scope.$on('$locationChangeSuccess', $scope.restoreState, true);

  $scope.saveState = function() {
    for(var i=0; i < params.length; i++) {
      param = params[i];
      $location.search(param, $scope.getVar(param_map[param]));
    };
    $scope.oldSavedState = $location.search();
    $scope.createPermaLink($scope.oldSavedState);
    $scope.updateCosts();
  };

  $scope.createPermaLink = function(state) {
    //In-game browser doesn't let you modify the hash path, so this is a workaround
    var base = window.location.pathname + "#?"
    var pairs = [];
    for(var i=0; i < params.length; i++) {
      var param = params[i];
      pairs.push(param+"="+$scope.getVar(param_map[param]));
    }
    $scope.permaLink = base + pairs.join("&");
  };

  $scope.getVar = function(name) {
    if(name in $scope) {
      if(typeof $scope[name] === 'object')
        return $scope[name].name;
      else
        return $scope[name].toString();
    } else
      return undefined;
  };

  $scope.calcUpdate = function(param, urlValue) {
    var urlDef = angular.isDefined(urlValue);
    $scope.status = "updateParams("+param+")";
    switch(param) {
      case "route":
        $scope.updateRoute(urlValue);
        $scope.filterStations();
        break;
      case "pickup":
      case "dest":
        $scope.updateStation("form_"+param, urlValue);
        $scope.filterStations();
        break;
      case "vol":
      case "val":
        if(urlDef)
          $scope["form_"+param] = parseFloat(urlValue);
        // Covers invalid number in url, or clearing of input in form
        if($scope["form_"+param] === null || isNaN($scope["form_"+param]))
          $scope["form_"+param] = 0;
        break;
      case "cntr":
        if(urlDef)
          $scope["form_container"] = urlValue == "true";
        break;
      case "credit":
        if(urlDef)
          $scope["creditDiscount"] = parseFloat(urlValue);
        // Covers invalid number in url, or clearing of input in form
        if($scope["creditDiscount"] === null || isNaN($scope["creditDiscount"]))
          $scope["creditDiscount"] = 0;
        break;
    };
    if(!urlDef)
      $scope.saveState();
  };

  $scope.updateRoute = function(urlValue) {
    if(angular.isUndefined(urlValue)) {
      //Update from form
      if(!$scope.isValidRoute($scope.form_route))
        //Existing route is invalid, clear it.
        $scope.form_route = "";
      $scope.form_pickup = "";
      $scope.form_dest = "";
    } else {
      //Update from url
      urlValue = urlValue.toLowerCase();
      if($scope.isValidRoute(urlValue)) {
        if($scope.form_route != urlValue) {
          //New valid route
          $scope.form_route = urlValue;
          $scope.form_pickup = "";
          $scope.form_dest = "";
        }
      } else {
        $scope.form_route = "";
        $scope.form_pickup = "";
        $scope.form_dest = "";
      }
    }
  };

  $scope.isValidRoute = function(value) {
    return (routes.indexOf(value) > -1)
  };

  $scope.filterStations = function() {
    var pickupStations = [];
    var destStations = [];
    var pickup = $scope.form_pickup;
    var route = $scope.route;
    for(var i in $scope.stations) {
      stn = $scope.stations[i];
      if($scope.form_route != stn.route)
        continue;
      if(!stn.destOnly)
        pickupStations.push(stn);
      if(!stn.pickupOnly && stn != $scope.form_pickup) {
        if(angular.isUndefined(pickup.validDests) ||
            (pickup.validDests.indexOf(stn.name) > -1))
          destStations.push(stn);
        };
    };
    $scope.pickupStations = pickupStations;
    $scope.destStations = destStations;
    if(pickupStations.length  == 1)
      $scope.form_pickup = pickupStations[0];
    if(destStations.length == 1)
      $scope.form_dest = destStations[0];
  };

  $scope.updateStation = function(type, urlValue) {
    if(angular.isUndefined(urlValue)) {
      //Update from form
      if(!$scope.isValidStation($scope[type]))
        $scope[type] = "";
    } else {
      //Update from url
      if(!$scope.isValidStation(urlValue))
        $scope[type] = "";
      else
        $scope[type] = $scope.findStation(urlValue);
    }
    if($scope.form_pickup == "" ||
        $scope.form_pickup == $scope.form_dest)
      $scope.form_dest = "";
  };

  $scope.isValidStation = function(check) {
    var stn = $scope.findStation(check);
    if(stn && $scope.form_route == stn.route)
      return true;
    else
      return false;
  };

  $scope.findStation = function(check) {
    var name = check;
    if(typeof check == "object")
      name=check.name;
    for(var i in $scope.stations) {
      var stn = $scope.stations[i];
      if(name.toUpperCase() == stn.name.toUpperCase())
        return stn;
    };
  };


  $scope.stations = [
    {
      id: 60008494,
      name: 'Amarr',
      full: 'Amarr VIII (Oris) - Emperor Family Academy',
      url: 'http://evemaps.dotlan.net/station/Amarr_VIII_(Oris)_-_Emperor_Family_Academy',
      route: "catch",
      sec: "high",
    },
    {
      id: 60003616,
      name: 'Dabrid',
      full: 'Dabrid V - Moon 1 - Caldari Business Tribunal Accounting',
      url: 'http://evemaps.dotlan.net/station/Dabrid_V_-_Moon_1_-_Caldari_Business_Tribunal_Accounting',
      route: "catch",
      sec: "high",
    },
    {
      id: 61000744,
      name: '4-07MU',
      full: '4-07MU V - The Thalamus',
      url: 'http://evemaps.dotlan.net/outpost/4-07MU',
      route: "catch",
      sec: "null",
    },
    ];
  $scope.filterStations();
}
