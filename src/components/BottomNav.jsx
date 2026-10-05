function BottomNav({ activeView, items, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Hoofnavigasie">
      {items.map((item) => (
        <button
          className={activeView === item.id ? 'nav-button active' : 'nav-button'}
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
