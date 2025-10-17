export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Portfolio Value', value: '$0.00' },
          { title: 'Active Sessions', value: '0' },
          { title: 'Connected Wallets', value: '0' },
          { title: 'Active Strategies', value: '0' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-gray-600 text-sm">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
