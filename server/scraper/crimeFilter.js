const crimeKeywords = [

    // Murder / violence
    "murder",
    "murdered",
    "killed",
    "killing",
    "died",
    "dead",
    "cops",
    "kill",
    "homicide",
    "assault",
    "attacked",
    "attack",
    "stabbing",
    "stabbed",
    "shooting",
    "shot dead",
    "gunshot",
    "violence",

    "chain snatching",

"road rage",

"drunk driving",

"drink and drive",

"honour killing",

"honor killing",

"human trafficking",

"narcotics",
"gang rape",

"contraband",

"smuggling",

"trafficking",

"bribe",

"bribery",

"corruption",

"embezzlement",

"money laundering",

"forgery",

"counterfeit",

"blackmail",

"ransom",

"trespassing",
"hooliganism",

"manslaughter",

"suspect",

    // Sexual crimes
    "rape",
    "raped",
    "molestation",
    "sexual assault",
    "sexual harassment",

    // Robbery / theft
    "robbery",
    "robbed",
    "robber",
    "theft",
    "stolen",
    "stealing",
    "burglary",
    "burglar",
    "snatching",
    "snatched",
    "loot",
    "looted",
    "dacoity",
    "dacoit",
    "beaten",
    // Kidnapping
    "kidnap",
    "kidnapped",
    "kidnapping",
    "abduction",
    "abducted",
    "accident",
     "collision",
      "hit and run",
       "crash", 
        "overturned",
         "run over",
          "fatal crash",
        "fire",
         "blaze",
          "cylinder blast",
           "fire tenders", 
        "short circuit",
         "burnt",
          "factory fire",
          "waterlog",
          "waterloging",
          

    // Fraud
    "fraud",
    "fraudulent",
    "scam",
    "scammed",
    "cheating",
    "cheated",
    "cybercrime",
    "cyber crime",
    "online fraud",

    // Weapons
    "weapon",
    "weapons",
    "pistol",
    "revolver",
    "firearm",
    "gun",
    "knife",

    // Gang / organised crime
    "gang",
    "gangster",
    "extortion",
    "extortionist",

    // Criminal proceedings
    "fir registered",
    "fir filed",
    "criminal case",
    "criminal",
    "accused",

    // Other crimes
    "riot",
    "rioting",
    "arson",
    "vandalism",
    "hit-and-run",
    "hit and run"
];

function isCrime(article) {
    const text = `${article.title} ${article.text}`.toLowerCase();

    return crimeKeywords.some((keyword) =>
        text.includes(keyword)
    );
}

module.exports = { isCrime };