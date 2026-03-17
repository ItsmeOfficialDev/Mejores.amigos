const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Anime = require('../models/Anime');

const animeList = [
    "A Galaxy Next Door", "A Gatherer's Adventure in Isekai", "A sign of Affection", "A Silent Voice",
    "A Star Brighter Than the Sun", "A Returner's Magic Should Be Special", "Aesthetica of a Rogue Hero",
    "After the Rain", "Ah! My goddess", "Akudama drive", "Alya Sometimes Hides her Feelings In Russian",
    "Ameku M.D.: Doctor Detective", "An Archdemon's Dilemma: How to Love Your Elf Bride", "Anne Shirley",
    "Another", "Arifureta", "Attack On Titan", "ATRI -My Dear Moments-", "Back Street Girls -GOKUDOLS-",
    "Bad Girl", "Bartender Glass OF God", "Beheneko", "Berserk of Gluttony", "Beyond the boundary",
    "Binchou-tan", "Black butler", "Black Clover", "Blade of the immortal", "Bleach", "Blood",
    "Blue Box", "Blue Exorcist", "Blue Lock", "Bogus Skill", "Boruto", "Buddy Daddies", "BULLET/BULLET",
    "Bungou Stray Dogs", "Call of the Night", "Captain Tsubasa", "City The Animation", "Clannad",
    "Classroom Of the Elite", "Chainsaw Man", "Chained soldier", "Chaika - the Coffin princess",
    "Chihayafuru", "Code Geass", "Cowboy Bebop", "Cromartie High School", "Cross ange: Rondo of Angel and Dragon",
    "Cupid's Chocolates", "Cyberpunk Edgerunners", "Dan da dan", "Danganronpa: The Animation",
    "Dark gathering", "Darling in the Franxx", "Date a Live", "Days with my stepsister",
    "Dealing with Mikadono Sisters Is a Breeze", "Death Parade", "Devilman Crybaby", "Death Note",
    "Demon Lord, Retry!", "Demon Slayer", "Dragon Ball", "Dragon Goes House-hunting", "Drifters",
    "Dog & Scissors", "Don't Toy With Me, Miss Nagatoro", "Dororo", "Dr. Ramune -Mysterious Disease Specialist-",
    "Erased", "Excel saga", "Even Given the Worthless “Appraiser” Class, I’m Actually the Strongest",
    "Electromagnetic Girlfriend", "Failure Frame", "Fairy tail", "Farming Life in Another World",
    "Fireworks", "Fire force", "Food For the Soul", "Food Wars!", "Frieren : Beyond journey's End",
    "From the New World", "Fullmetal Alchemist", "Gachiakuta", "Garo: The Animation", "GATE",
    "Ghost Stories", "Gintama", "Giji Harem", "Girls Beyond the Wasteland", "Granblue Fantasy: The Animation",
    "Goblin Slayer", "Gods Game We Play", "Golden boy", "Grandpa And Grandma Turn Young Again",
    "Gave of the Fireflies", "Grimgar ashes and illusions", "Guilty Crown", "Hajime No Ippo", "Haikyu!!",
    "Heaven's Memo pad", "Headhunted to Another World: From Salaryman to Big Four!", "Hellsing",
    "Hell's paradise", "Heavenly Delusion", "Heaven official's blessing", "Hero Without a Class: Who Even Needs Skills?!",
    "High school DxD", "Honey Lemon Soda", "Hokkaido Gals are Super Adorable!.", "Horimiya",
    "How I Attended an all -Guys Mixer", "Howl's Moving castle", "Hyouka", "I Couldn’t Become a Hero, So I Reluctantly Decided to Get a Job.",
    "I May Be a Guild Receptionist, but I’ll Solo Any Boss to Clock Out on Time", "In Another World With My Smartphone",
    "Insomniacs After School", "in/Spectre", "Ishura", "I've Been Killing Slimes for 300 Years and Maxed Out My Level",
    "I Got a Cheat Skill in Another World and Became Unrivaled in The Real World, Too",
    "I Left My A-Rank Party to Help My Former Students Reach the Dungeon Depths!",
    "I've Somehow Gotten Stronger When I Improved My Farm-Related Skills",
    "If My Wife becomes An Elementary School Student", "I’ll Become a Villainess Who Goes Down in History",
    "I’m Living with an Otaku NEET Kunoichi!?", "Jellyfish Can’t Swim in the Night", "Jujutsu Kaisen",
    "Jojo's Bizzare Adventure", "K - Project", "Kaguya Sama : Love is War", "Kaiju No.8", "kakushigoto",
    "Kaze no Yojimbo", "Komi can't Communicate", "Kanokon: The Girl Who Cried Fox", "Konosuba",
    "Kotaro Lives Alone", "Kowloon Generic Romance", "Kubo Won't Let Me Be Invisible", "Lazarus",
    "Let’s Play", "Liar, Liar", "Link Click", "Look Back", "Loner life in another world", "Lord of Mysteries",
    "Lord of Vermilion: The Crimson King", "Love After World Domination", "Love and Lies", "Love flops",
    "Love is Indivisible by Twins", "Love, chunibyo & other delusions", "Maboroshi", "Maburaho",
    "Made in Abyss", "Magia Record: Puella Magi Madoka Magica Side Story", "Magical Witch Punie-Chan",
    "Maid-Sama!", "Makeine: Too Many Losing Heroines!", "March Comes in like a lion", "Masamune kun's Revenge",
    "Mashle : Magic And Muscles", "May I Ask for One Final Thing?", "Mayonaka Punch", "Medalist",
    "Medaka Kuroiwa is Impervious to My Charms", "Mecha Ude: Mechanical Arms", "Miss Caretaker of Sunohara-sou",
    "Miss Kobayashi's Dragon Maid", "Mission: Yozakura Family", "Monster", "Moonrise",
    "More than a Married Couple, but Not Lovers", "Mushoku Tensei : Jobless Reincarnation", "Mushi-shi",
    "My Clueless First Friend", "My Deer Friend Nokotan", "My Dressup darling",
    "My Gift Lvl 9999 Unlimited Gacha: Backstabbed in a Backwater Dungeon, I'm Out for Revenge!",
    "My Happy Marriage", "My Home Hero", "My Stepmom's Daughter is My Ex", "My Instant Death Ability is Overpowered",
    "My Little Monster", "My One-Hit Kill Sister", "My Sweet Tyrant", "My Teen Romantic Comedy Snafu",
    "My Wife Has No Emotion", "Naruto", "New Saga", "Ninja kamui", "Ninja Vs. Gokudo", "Nina the Starry Bride",
    "Nisekoi", "No Game No Life", "Nukitashi THE ANIMATION", "One Punch Man", "Orient", "Oshi no ko",
    "One Piece [Sub]", "One piece [Dual]", "Our Last Crusade or the Rise of a New World",
    "Our love has always been 10 centimeters apart.", "Overlord", "Pass the Monster Meat, Milady!",
    "Parasyte - The Maxim", "Peter grill and the philosopher's Time", "Plus - Sized Elf", "Pluto",
    "Pompo: the Cinephile", "Possibly the Greatest Alchemist Of all time", "Princess Jellyfish",
    "Ragna Crimson", "Ranma 1/2 (2024)", "Rascal Does not Dream of Bunny Girl Senpai", "Redo of Healer",
    "Re-Main", "Re: Monster", "Re: Zero", "Reign of the seven spellblades", "Record of Lodoss War",
    "Record of Ragnarok", "Rent a girlfriend", "Romantic killer", "Ron kamonohashi's forbidden Deductions",
    "Run with the Wind", "Sanda", "Sailor Moon", "Saint Cecilia & Pastor Lawrence", "Sakamoto days",
    "Secrets of the Silent Witch", "Sacrificial Princess and the King of Beasts", "Seirei Gensouki: Spirit Chronicles",
    "Servant x Service", "Scissor Seven", "Scooped Up by an S-Rank Adventurer!", "Scum's Wish",
    "Shangri-La Frontier", "Shiki", "Shikimori's not just a cutie", "Shoshimin: How to Became Ordinary",
    "Sing 'yesterday' for me", "Sirius the Jaeger", "Solo leveling", "Sounds of Life!", "Spirited Away",
    "Spriggan", "Spy X Family", "Steins;Gate", "Studio Apartment, Good Lighting, Angel Included",
    "Suicide Squad Isekai", "Summer time Rendering", "Sugar Apple Fairy Tale", "Super Cube",
    "Suzuka | Fuuka", "Sword of the Demon Hunter: Kijin Gentosho", "Tasuuketsu - Fate of the Majority",
    "Tatsuki Fujimoto 17-26", "Takopi's Original Sin", "Teasing Master Takagi-san", "The Ancient Magus' Bride",
    "The Angel Next Door Spoils Me Rotten", "The Apothecary Diaries", "The Aristocrat’s Otherworldly Adventure: Serving Gods Who Go Too Far",
    "The Banished Court Magician Aims to Become the Strongest", "The beginning after the end",
    "The Boy and the Heron", "The Brilliant Healer's New Life in the Shadows", "The Case Study of Vanitas",
    "The God of High School", "That Time I got Reincarnated as a slime", "The Dark History of the Reincarnated Villainess",
    "The Detective is Already Dead", "The Dangers in My Heart", "The Dinner table detective",
    "The Duke of death and his Maid", "The Demon Sword Master of Excalibur Academy", "The Dreaming boy is a Realist",
    "The Elusive Samurai", "The Eminence In Shadow", "The Executioner and Her Way of Life", "The Fable",
    "The Fragrant Flower Blooms With Dignity", "The Fruit of Evolution: Before I Knew It, My Life Had It Made",
    "The Future Diary", "The Garden of Words", "The Gene of AI", "The Girl Who Leapt Through Time",
    "The Healer Who Was Banished From His Party", "The irregular at Magic High school",
    "The Iceblade Sorcerer Shall Rule the World", "The Ice Guy And His Cool Female Colleague",
    "The Law of Ueki", "The Legendary Hero is Dead!", "The Magical Girl and the Evil Lieutenant",
    "The Reason why Raeliana ended up at the Duke's Mansion", "The Red Ranger Becomes an Adventurer in Another World",
    "The Rising of the Shield Hero", "The Reincarnation of The Strongest Exorcist",
    "The Strongest Magician in the Demon Lord's Army", "The Strongest Tank's Labyrinth Raids",
    "The Summer Hikaru Died", "The Testament of Sister New Devil", "The Tunnel to Summer, the Exit of Goodbyes",
    "The Kingdoms of Ruin", "The Knight in the Area", "The Misfit of Demon king Academy", "The Sacred Blacksmith",
    "The Most Notorious \"Talker\" Runs the World's Greatest Clan",
    "The Ossan Newbie Adventurer, Trained to Death by the Most Powerful Party, Became Invincible",
    "The Unwanted Undead Adventurer", "The World's Finest Assassin Reincarnated in Another World as Aristocrat",
    "The Last Summoner", "The Quintessential Quintuplets", "The Unaware Atelier Meister", "The Water Magician",
    "The Way of the Househusband", "The 100 Girlfriends Who Really, Really, Really, Really Love You", "To Be Hero X",
    "Tokyo Godfathers", "Tokyo Revengers", "Tomo Chan is a Girl", "To love ru", "Tower of God", "Tokyo Ghoul",
    "Tomodachi Game", "Tonikawa: Over the moon for you", "Tougen Anki", "Trinity Seven", "Trillion Game",
    "True beauty", "Tsukimichi - Moonlit Fantasy", "Tying the Knot with an Amagami Sister", "Ubel blatt",
    "Unnamed Memory", "Utawarerumono", "Uzumaki", "Undefeated bahumat chronicle", "Vermeil in Gold",
    "Vinland Saga", "Violet Evergarden", "VTuber Legend", "Wandance", "Watari-kun's ***** Is about to Collapse",
    "We never learn: bokuben", "Welcome to the N-H-K", "Wind Breaker", "Wistoria: Wand and Sword",
    "Witch Watch", "With You and the Rain", "With You, Our Love Will Make It Through",
    "Why Does Nobody Remember Me in This World?", "World trigger", "Wotakoi: Love is Hard for otaku",
    "Yakuza Fiancé", "Yandere Dark Elf: She Chased Me All the Way From Another World!", "You are Ms. Servant",
    "Your lie in April", "Your Name", "Yuru Yuri", "Zenshu", "Zom 100 : Bucket List Of The Dead",
    "2.5 Dimensional Seduction", "365 Days to the wedding", "5 Centimeters Per Second", "7th Time Loop"
];

async function scrape() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test");
        console.log('Scraping starting...');

        for (const title of animeList) {
            const existing = await Anime.findOne({ titleLower: title.toLowerCase() });
            if (existing && existing.posterUrl) continue;

            try {
                const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
                const meta = res.data.data[0];
                if (meta) {
                    await Anime.findOneAndUpdate(
                        { titleLower: title.toLowerCase() },
                        {
                            title: meta.title,
                            titleLower: meta.title.toLowerCase(),
                            posterUrl: meta.images.webp.large_image_url || meta.images.webp.image_url,
                            jikanId: meta.mal_id,
                            synopsis: meta.synopsis,
                            type: meta.type?.toLowerCase() || 'tv'
                        },
                        { upsert: true }
                    );
                    console.log(`✅ ${title}`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
            } catch (e) {
                console.error(`❌ ${title}: ${e.message}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

scrape();
