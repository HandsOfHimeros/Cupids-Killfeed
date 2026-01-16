// DayZ Weapon Kits with Compatible Attachments
// Based on cfgspawnabletypes.xml structure

module.exports = {
    // ==================== ASSAULT RIFLE KITS ====================
    
    M4A1: {
        name: "M4A1 Combat Kit",
        basePrice: 1200,
        category: "assault_rifle",
        baseWeapon: {
            class: "M4A1",
            variants: ["M4A1", "M4A1_Black", "M4A1_Green"]
        },
        attachments: {
            buttstock: {
                required: true,
                name: "Buttstock",
                options: [
                    { class: "M4_OEBttstck", name: "OE Buttstock", price: 0 },
                    { class: "M4_OEBttstck_Black", name: "OE Buttstock (Black)", price: 5 },
                    { class: "M4_OEBttstck_Green", name: "OE Buttstock (Green)", price: 5 },
                    { class: "M4_MPBttstck", name: "MP Buttstock", price: 50 },
                    { class: "M4_MPBttstck_Black", name: "MP Buttstock (Black)", price: 55 },
                    { class: "M4_MPBttstck_Green", name: "MP Buttstock (Green)", price: 55 },
                    { class: "M4_CQBBttstck", name: "CQB Buttstock", price: 75 },
                    { class: "M4_CQBBttstck_Black", name: "CQB Buttstock (Black)", price: 80 },
                    { class: "M4_CQBBttstck_Green", name: "CQB Buttstock (Green)", price: 80 }
                ]
            },
            handguard: {
                required: true,
                name: "Handguard",
                options: [
                    { class: "M4_PlasticHndgrd", name: "Plastic Handguard", price: 0 },
                    { class: "M4_PlasticHndgrd_Black", name: "Plastic Handguard (Black)", price: 5 },
                    { class: "M4_PlasticHndgrd_Green", name: "Plastic Handguard (Green)", price: 5 },
                    { class: "M4_RISHndgrd", name: "RIS Handguard", price: 100 },
                    { class: "M4_RISHndgrd_Black", name: "RIS Handguard (Black)", price: 105 },
                    { class: "M4_RISHndgrd_Green", name: "RIS Handguard (Green)", price: 105 },
                    { class: "M4_MPHndgrd", name: "MP Handguard", price: 80 },
                    { class: "M4_MPHndgrd_Black", name: "MP Handguard (Black)", price: 85 },
                    { class: "M4_MPHndgrd_Green", name: "MP Handguard (Green)", price: 85 }
                ]
            },
            optic: {
                required: false,
                name: "Optic",
                options: [
                    { class: null, name: "Iron Sights", price: 0 },
                    { class: "M4_CarryHandleOptic", name: "Carry Handle Optic", price: 60 },
                    { class: "BUISOptic", name: "BUIS Optic", price: 80 },
                    { class: "M68Optic", name: "M68 Red Dot", price: 120 },
                    { class: "ACOGOptic", name: "ACOG Scope", price: 180 },
                    { class: "M4_T3NRDSOptic", name: "T3N RDS Optic", price: 150 },
                    { class: "ReflexOptic", name: "Reflex Sight", price: 100 }
                ]
            },
            suppressor: {
                required: false,
                name: "Suppressor",
                options: [
                    { class: null, name: "No Suppressor", price: 0 },
                    { class: "M4_Suppressor", name: "M4 Suppressor", price: 250 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_STANAG_30Rnd", name: "2x 30Rnd STANAG", quantity: 2, price: 100 },
                    { class: "Mag_STANAG_30Rnd", name: "4x 30Rnd STANAG", quantity: 4, price: 180 },
                    { class: "Mag_STANAG_60Rnd", name: "2x 60Rnd Coupled STANAG", quantity: 2, price: 300 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_556x45_20Rnd", name: "1x Ammo Box (20rnd)", quantity: 1, price: 100 },
                    { class: "AmmoBox_556x45_20Rnd", name: "2x Ammo Boxes (40rnd)", quantity: 2, price: 180 },
                    { class: "AmmoBox_556x45_20Rnd", name: "4x Ammo Boxes (80rnd)", quantity: 4, price: 320 },
                    { class: "AmmoBox_556x45Tracer_20Rnd", name: "2x Tracer Boxes (40rnd)", quantity: 2, price: 220 }
                ]
            }
        }
    },

    AKM: {
        name: "AKM Combat Kit",
        basePrice: 1100,
        category: "assault_rifle",
        baseWeapon: {
            class: "AKM",
            variants: ["AKM"]
        },
        attachments: {
            buttstock: {
                required: true,
                name: "Buttstock",
                options: [
                    { class: "AK_WoodBttstck", name: "Wood Buttstock", price: 0 },
                    { class: "AK_FoldingBttstck", name: "Folding Buttstock", price: 80 },
                    { class: "AK_PlasticBttstck", name: "Plastic Buttstock", price: 60 },
                    { class: "AK74_WoodBttstck", name: "AK74 Wood Buttstock", price: 50 },
                    { class: "AKS74U_Bttstck", name: "AKS74U Buttstock", price: 70 }
                ]
            },
            handguard: {
                required: true,
                name: "Handguard",
                options: [
                    { class: "AK_WoodHndgrd", name: "Wood Handguard", price: 0 },
                    { class: "AK_WoodHndgrd_Black", name: "Wood Handguard (Black)", price: 5 },
                    { class: "AK_WoodHndgrd_Camo", name: "Wood Handguard (Camo)", price: 10 },
                    { class: "AK_RailHndgrd", name: "Rail Handguard", price: 120 },
                    { class: "AK_RailHndgrd_Black", name: "Rail Handguard (Black)", price: 125 },
                    { class: "AK_RailHndgrd_Green", name: "Rail Handguard (Green)", price: 125 },
                    { class: "AK_PlasticHndgrd", name: "Plastic Handguard", price: 80 },
                    { class: "AK74_Hndgrd", name: "AK74 Handguard", price: 70 }
                ]
            },
            optic: {
                required: false,
                name: "Optic",
                options: [
                    { class: null, name: "Iron Sights", price: 0 },
                    { class: "KashtanOptic", name: "Kashtan Optic", price: 150 },
                    { class: "PSO11Optic", name: "PSO-1 Scope", price: 180 },
                    { class: "PSO1Optic", name: "PSO-1-1 Scope", price: 200 },
                    { class: "KobraOptic", name: "Kobra Red Dot", price: 120 }
                ]
            },
            suppressor: {
                required: false,
                name: "Suppressor",
                options: [
                    { class: null, name: "No Suppressor", price: 0 },
                    { class: "AK_Suppressor", name: "AK Suppressor", price: 250 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_AKM_30Rnd", name: "2x 30Rnd Mag", quantity: 2, price: 150 },
                    { class: "Mag_AKM_30Rnd", name: "4x 30Rnd Mag", quantity: 4, price: 280 },
                    { class: "Mag_AKM_Palm30Rnd", name: "3x Palm Mag", quantity: 3, price: 220 },
                    { class: "Mag_AKM_Drum75Rnd", name: "1x 75Rnd Drum", quantity: 1, price: 320 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_762x39_20Rnd", name: "2x Ammo Box (40rnd)", quantity: 2, price: 200 },
                    { class: "AmmoBox_762x39_20Rnd", name: "4x Ammo Box (80rnd)", quantity: 4, price: 360 },
                    { class: "AmmoBox_762x39Tracer_20Rnd", name: "2x Tracer Box", quantity: 2, price: 240 }
                ]
            }
        }
    },

    AK74: {
        name: "AK74 Combat Kit",
        basePrice: 1050,
        category: "assault_rifle",
        baseWeapon: {
            class: "AK74",
            variants: ["AK74", "AK74_Black", "AK74_Green"]
        },
        attachments: {
            buttstock: {
                required: true,
                name: "Buttstock",
                options: [
                    { class: "AK74_WoodBttstck", name: "Wood Buttstock", price: 0 },
                    { class: "AK_FoldingBttstck", name: "Folding Buttstock", price: 80 },
                    { class: "AK_PlasticBttstck", name: "Plastic Buttstock", price: 60 },
                    { class: "AKS74U_Bttstck", name: "AKS74U Buttstock", price: 70 }
                ]
            },
            handguard: {
                required: true,
                name: "Handguard",
                options: [
                    { class: "AK74_Hndgrd", name: "AK74 Handguard", price: 0 },
                    { class: "AK_RailHndgrd", name: "Rail Handguard", price: 120 },
                    { class: "AK_PlasticHndgrd", name: "Plastic Handguard", price: 80 }
                ]
            },
            optic: {
                required: false,
                name: "Optic",
                options: [
                    { class: null, name: "Iron Sights", price: 0 },
                    { class: "KashtanOptic", name: "Kashtan Optic", price: 150 },
                    { class: "PSO11Optic", name: "PSO-1 Scope", price: 180 },
                    { class: "KobraOptic", name: "Kobra Red Dot", price: 120 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_AK74_30Rnd", name: "3x 30Rnd Mag", quantity: 3, price: 180 },
                    { class: "Mag_AK74_45Rnd", name: "2x 45Rnd Mag", quantity: 2, price: 200 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_545x39_20Rnd", name: "2x Ammo Box", quantity: 2, price: 180 },
                    { class: "AmmoBox_545x39_20Rnd", name: "4x Ammo Box", quantity: 4, price: 320 },
                    { class: "AmmoBox_545x39Tracer_20Rnd", name: "2x Tracer Box", quantity: 2, price: 220 }
                ]
            }
        }
    },

    AK101: {
        name: "AK101 Combat Kit",
        basePrice: 1150,
        category: "assault_rifle",
        baseWeapon: {
            class: "AK101",
            variants: ["AK101", "AK101_Black", "AK101_Green"]
        },
        attachments: {
            buttstock: {
                required: true,
                name: "Buttstock",
                options: [
                    { class: "AK_PlasticBttstck", name: "Plastic Buttstock", price: 0 },
                    { class: "AK_FoldingBttstck", name: "Folding Buttstock", price: 80 },
                    { class: "AKS74U_Bttstck", name: "AKS74U Buttstock", price: 70 }
                ]
            },
            handguard: {
                required: true,
                name: "Handguard",
                options: [
                    { class: "AK_PlasticHndgrd", name: "Plastic Handguard", price: 0 },
                    { class: "AK_RailHndgrd", name: "Rail Handguard", price: 120 },
                    { class: "AK74_Hndgrd", name: "AK74 Handguard", price: 70 }
                ]
            },
            optic: {
                required: false,
                name: "Optic",
                options: [
                    { class: null, name: "Iron Sights", price: 0 },
                    { class: "KashtanOptic", name: "Kashtan Optic", price: 150 },
                    { class: "PSO11Optic", name: "PSO-1 Scope", price: 180 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_AK101_30Rnd", name: "3x 30Rnd Mag", quantity: 3, price: 200 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_556x45_20Rnd", name: "2x Ammo Box", quantity: 2, price: 180 },
                    { class: "AmmoBox_556x45_20Rnd", name: "4x Ammo Box", quantity: 4, price: 320 }
                ]
            }
        }
    },

    // ==================== SNIPER RIFLE KITS ====================

    SVD: {
        name: "SVD Sniper Kit",
        basePrice: 2000,
        category: "sniper_rifle",
        baseWeapon: {
            class: "SVD",
            variants: ["SVD", "SVD_Wooden"]
        },
        attachments: {
            optic: {
                required: true,
                name: "Optic",
                options: [
                    { class: "PSO11Optic", name: "PSO-1-1 Scope", price: 0 },
                    { class: "KashtanOptic", name: "Kashtan Optic", price: 50 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_SVD_10Rnd", name: "2x 10Rnd Mag", quantity: 2, price: 180 },
                    { class: "Mag_SVD_10Rnd", name: "4x 10Rnd Mag", quantity: 4, price: 320 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_762x54_20Rnd", name: "2x Ammo Box", quantity: 2, price: 250 },
                    { class: "AmmoBox_762x54_20Rnd", name: "4x Ammo Box", quantity: 4, price: 450 },
                    { class: "AmmoBox_762x54Tracer_20Rnd", name: "2x Tracer Box", quantity: 2, price: 280 }
                ]
            }
        }
    },

    MOSIN: {
        name: "Mosin Nagant Sniper Kit",
        basePrice: 900,
        category: "sniper_rifle",
        baseWeapon: {
            class: "Mosin9130",
            variants: ["Mosin9130", "Mosin9130_Black", "Mosin9130_Camo", "Mosin9130_Green"]
        },
        attachments: {
            optic: {
                required: false,
                name: "Optic",
                options: [
                    { class: null, name: "Iron Sights", price: 0 },
                    { class: "PUScopeOptic", name: "PU Scope", price: 180 },
                    { class: "HuntingOptic", name: "Hunting Scope", price: 150 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_762x54_20Rnd", name: "1x Ammo Box (20rnd)", quantity: 1, price: 120 },
                    { class: "AmmoBox_762x54_20Rnd", name: "2x Ammo Box (40rnd)", quantity: 2, price: 220 },
                    { class: "Ammo_762x54", name: "Loose rounds (40)", quantity: 40, price: 150 }
                ]
            },
            bayonet: {
                required: false,
                name: "Bayonet",
                options: [
                    { class: null, name: "No Bayonet", price: 0 },
                    { class: "Mosin_Bayonet", name: "Mosin Bayonet", price: 80 }
                ]
            }
        }
    },

    // ==================== SHOTGUN KITS ====================

    SAIGA: {
        name: "Saiga Shotgun Kit",
        basePrice: 900,
        category: "shotgun",
        baseWeapon: {
            class: "Saiga",
            variants: ["Saiga"]
        },
        attachments: {
            buttstock: {
                required: true,
                name: "Buttstock",
                options: [
                    { class: "Saiga_Bttstck", name: "Saiga Buttstock", price: 0 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_Saiga_5Rnd", name: "3x 5Rnd Mag", quantity: 3, price: 120 },
                    { class: "Mag_Saiga_8Rnd", name: "2x 8Rnd Mag", quantity: 2, price: 180 },
                    { class: "Mag_Saiga_Drum20Rnd", name: "1x 20Rnd Drum", quantity: 1, price: 250 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition Type",
                options: [
                    { class: "AmmoBox_00buck_10rnd", name: "Buckshot (20rnd)", quantity: 2, price: 150 }
                ]
            }
        }
    },

    // ==================== PISTOL KITS ====================

    DEAGLE: {
        name: "Desert Eagle Kit",
        basePrice: 800,
        category: "pistol",
        baseWeapon: {
            class: "Deagle",
            variants: ["Deagle", "Deagle_Gold"]
        },
        attachments: {
            suppressor: {
                required: false,
                name: "Suppressor",
                options: [
                    { class: null, name: "No Suppressor", price: 0 },
                    { class: "PistolSuppressor", name: "Pistol Suppressor", price: 150 }
                ]
            },
            magazine: {
                required: true,
                name: "Magazine Package",
                options: [
                    { class: "Mag_Deagle_9rnd", name: "2x Magazine", quantity: 2, price: 100 },
                    { class: "Mag_Deagle_9rnd", name: "4x Magazine", quantity: 4, price: 180 }
                ]
            },
            ammo: {
                required: true,
                name: "Ammunition",
                options: [
                    { class: "AmmoBox_357_20Rnd", name: "1x Ammo Box", quantity: 1, price: 120 },
                    { class: "AmmoBox_357_20Rnd", name: "2x Ammo Box", quantity: 2, price: 220 }
                ]
            }
        }
    }
};
