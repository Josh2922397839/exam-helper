export const majorBones = [
  { name: 'Cranium', location: 'Head (skull)', type: 'Flat Bone', count: '1 (22 fused bones)', desc: 'The cranium is the bony structure that encases and protects the brain.', open: false },
  { name: 'Clavicle', location: 'Shoulder (collarbone)', type: 'Long Bone', count: '2', desc: 'Connects the arm to the body and helps stabilize the shoulder.', open: false },
  { name: 'Scapula', location: 'Upper back (shoulder blade)', type: 'Flat Bone', count: '2', desc: 'Triangular bone connecting humerus with clavicle.', open: false },
  { name: 'Humerus', location: 'Upper arm', type: 'Long Bone', count: '2', desc: 'Largest bone in the upper limb.', open: false },
  { name: 'Radius', location: 'Forearm (thumb side)', type: 'Long Bone', count: '2', desc: 'Allows forearm rotation.', open: false },
  { name: 'Ulna', location: 'Forearm (pinky side)', type: 'Long Bone', count: '2', desc: 'Forms the point of the elbow.', open: false },
  { name: 'Carpals', location: 'Wrist', type: 'Short Bone', count: '16', desc: 'Small bones allowing wrist movement.', open: false },
  { name: 'Ribs', location: 'Chest (thorax)', type: 'Flat Bone', count: '24', desc: 'Protective cage for heart and lungs.', open: false },
  { name: 'Sternum', location: 'Center of chest', type: 'Flat Bone', count: '1', desc: 'Breastbone protecting major vessels.', open: false },
  { name: 'Vertebral Column', location: 'Spine', type: 'Irregular Bone', count: '33 (26 in adults)', desc: 'Protects spinal cord.', open: false },
  { name: 'Pelvis', location: 'Hip region', type: 'Flat Bone', count: '1', desc: 'Supports weight and protects internal organs.', open: false },
  { name: 'Femur', location: 'Upper leg (thigh)', type: 'Long Bone', count: '2', desc: 'Longest and strongest bone in the body.', open: false },
  { name: 'Patella', location: 'Knee (kneecap)', type: 'Sesamoid Bone', count: '2', desc: 'Protects knee joint.', open: false },
  { name: 'Tibia', location: 'Lower leg (shinbone)', type: 'Long Bone', count: '2', desc: 'Larger weight-bearing lower leg bone.', open: false },
  { name: 'Fibula', location: 'Lower leg (outer)', type: 'Long Bone', count: '2', desc: 'Attachment point for muscles.', open: false },
  { name: 'Tarsals', location: 'Ankle/Foot', type: 'Short Bone', count: '14', desc: 'Bones forming the ankle.', open: false }
];

export const muscleTypes = [
  { name: 'Skeletal Muscle', icon: 'fas fa-hand-fist', color: 'red', desc: 'Attached to bones. Voluntary control. Striated appearance.', location: 'Skeletal system', control: 'Voluntary', function: 'Movement, posture, heat production' },
  { name: 'Smooth Muscle', icon: 'fas fa-lungs', color: 'pink', desc: 'Walls of internal organs. Involuntary control. Non-striated.', location: 'Organs, blood vessels', control: 'Involuntary', function: 'Move substances through organs' },
  { name: 'Cardiac Muscle', icon: 'fas fa-heart-pulse', color: 'rose', desc: 'Wall of the heart. Involuntary control. Striated with intercalated discs.', location: 'Heart', control: 'Involuntary', function: 'Pump blood' }
];

export const drugsInSport = [
  { name: 'Anabolic Steroids', icon: 'fas fa-pills', color: 'red', desc: 'Synthetic testosterone. Promote muscle growth.', examples: 'Nandrolone, Testosterone', benefits: 'Increased mass and strength', risks: 'Heart enlargement, liver damage, aggression', open: false },
  { name: 'Stimulants', icon: 'fas fa-bolt', color: 'orange', desc: 'Increase alertness and energy.', examples: 'Amphetamines, Cocaine', benefits: 'Improved endurance and focus', risks: 'Heart attack, anxiety', open: false },
  { name: 'Hormones (EPO & HGH)', icon: 'fas fa-vial', color: 'purple', desc: 'Stimulate cell production.', examples: 'EPO, HGH', benefits: 'Increased oxygen capacity, muscle growth', risks: 'Blood clots, stroke', open: false },
  { name: 'Diuretics', icon: 'fas fa-droplet', color: 'blue', desc: 'Increase urine production.', examples: 'Furosemide', benefits: 'Rapid weight loss, masking other drugs', risks: 'Dehydration, kidney problems', open: false }
];

export const wadaRoles = [
  { icon: 'fas fa-list-check', label: 'Prohibited List', desc: 'Maintains list of banned substances.' },
  { icon: 'fas fa-book', label: 'Anti-Doping Code', desc: 'Sets global rules for sports orgs.' },
  { icon: 'fas fa-microscope', label: 'Research', desc: 'Conducts research to detect doping.' },
  { icon: 'fas fa-vials', label: 'Testing', desc: 'Oversees in-competition testing.' }
];
