const featureData = [
    {
        icon: '/bolt.png',
        title: 'Global Deduplication',
        image: '/f1.png',
        description: "Our SHA-256 hashing engine intelligently eliminates redundancy from your vault. Upload with confidence, knowing you're only using space for truly unique data."
    },
    {
        icon: '/bolt.png',
        title: 'Powerful Search & Filtering',
        image: '/search.png',
        description: 'Query your entire vault by name, type, size, and more. Our server-side indexing delivers results in milliseconds, from your first file to your millionth.'
    },
    {
        icon: '/bolt.png',
        title: 'Controlled Sharing',
        image: '/share.png',
        description: 'From global public access with analytics to restricted sharing with teammates, manage every file permission with ease and confidence.'
    },
    {
    icon: '/bolt.png',
    title: 'Analytics Dashboard',
    image: '/analytics.png',
    description: 'Gain valuable insights with a built-in dashboard. Track uploads over time, visualize your file type breakdown, and monitor storage efficiency with real-time data.'
},
{
    icon: '/bolt.png',
    title: 'Admin & Team Roles',
    image: '/admin.png',
    description: 'Manage your organization with ease using built-in Role-Based Access Control. Assign Admin privileges for system-wide oversight, while users maintain private, secure vaults.'
},
{
    icon: '/bolt.png',
    title: 'End-to-End Security',
    image: '/security.png',
    description: "Security isn't an afterthought; it's our foundation. With bcrypt password hashing and strict ownership policies, your data is protected at every layer."
}
];

const FeatureCard = ({ icon, title, image, description }) => (
    <div className="feature">
        <div className="featuretop">
            <img src={icon} alt="" className="ficon" />
            <div className="ftoptag">{title}</div>
        </div>
        <img src={image} alt="" className="featureimg" />
        <div className="featurebottom">{description}</div>
    </div>
);

export default function Features() {
    return (
        <div className="features">
            <div className="featureshead">Features.</div>
            <div className="featuresdesc">What we Offer.</div>
            <div className="featuresgrid">
                {featureData.map((feature, index) => (
                    <FeatureCard
                        key={index}
                        icon={feature.icon}
                        title={feature.title}
                        image={feature.image}
                        description={feature.description}
                    />
                ))}
            </div>
        </div>
    );
}